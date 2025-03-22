import { MCUManager, MGMT_OP, MGMT_ERR, ResponseError } from './mcumgr';
import { Log } from '../utilities'; // Assuming you have an imageHash function
import { samplesParser_encode, SamplePack, samplesParser_decode } from '../parsers/samples_parser';

let log = new Log('smpl_mgr', Log.LEVEL_DEBUG);

// Enums for better type safety
enum _MGMT_ID {
    IDs = 0,
    UPLOAD = 1,
    ISSET = 2,
    SPACE_USED = 3,
}

enum _STATE {
    IDLE,
    UPLOADING,
    DOWNLOADING,
}

interface IDResponse {
    ids: number[];
}

interface ISSETResponse {
    set: boolean;
}

interface SpaceUsedResponse {
    tot: number; // total
    usd: number; // storage used
}

interface UploadRequest {
    len: number; // length of all samples
    off: number; // offset of image chunk the request carries
    data: Uint8Array; // image data to write at provided offset
}

interface UploadResponse {
    off: number; // Offset of last successfully written byte of update
}

interface DownloadRequest {
    off: number;
}

interface DownloadResponse {
    len?: number;
    off: number;
    data: Uint8Array;
}

export class SampleManager {
    private readonly GROUP_ID = 100;
    private state: _STATE = _STATE.IDLE;
    private mcumgr: MCUManager;

    constructor(mcumgr: MCUManager) {
        this.mcumgr = mcumgr;
    }

    async isSet(): Promise<boolean> {
        log.debug('Checking if any samples are set');
        const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.ISSET) as ISSETResponse | ResponseError;
        if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
            log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
            return Promise.reject((response as ResponseError).rc);
        }
        const responseSuccess = response as ISSETResponse;
        return responseSuccess.set;
    }

    async getIDs(): Promise<number[]> {
        log.debug('Getting sample ID');
        const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.IDs) as IDResponse | ResponseError;
        if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
            log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
            return Promise.reject((response as ResponseError).rc);
        }
        const responseSuccess = response as IDResponse;
        log.debug(`Received sample IDs: ${responseSuccess.ids}`);
        return responseSuccess.ids;
    }

    async getSpaceUsed(): Promise<number> {
        log.debug('Getting space used');
        const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.SPACE_USED) as SpaceUsedResponse | ResponseError;
        if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
            log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
            return Promise.reject((response as ResponseError).rc);
        }
        const ok = response as SpaceUsedResponse;
        log.debug(`Received storage, total: ${ok.tot}, used: ${ok.usd}`);
        return ok.usd / ok.tot * 100;
    }

    // Start the image upload process
    async uploadSamples(image: SamplePack, uploadProgressUpdate?: (percent: Number) => void): Promise<boolean> {
        log.debug('Starting sample upload process');
        if (this.state !== _STATE.IDLE) {
            log.error('Cant start upload when not in idle state');
            return Promise.reject('Cant start upload when not in idle state');
        }

        this.state = _STATE.UPLOADING; // dumy to get rid of TS errors

        const maxPayloadSize = this.mcumgr.maxPayloadSize; // Max payload size from MCUManager
        const samplesBlob = samplesParser_encode(image);
        const totalLength = samplesBlob.byteLength;
        let offset = 0;
        
        while (this.state === _STATE.UPLOADING && offset < totalLength) {
            log.debug(`Current offset: ${offset}, Total length: ${totalLength}`);

            // Prepare the initial payload
            let payload: UploadRequest = {
                off: offset,
                data: new Uint8Array([]),
                len: totalLength,
            };
            let payloadEncoded = this._payloadUploadEncode(payload);
            log.debug(`Initial payload size (without data): ${payloadEncoded.byteLength} bytes`);

            // Calculate the maximum data size that fits within the MTU
            const maxDataSize = maxPayloadSize - payloadEncoded.byteLength - 20;
            log.debug(`Max data size for this chunk: ${maxDataSize} bytes`);

            if (maxDataSize <= 0) {
                log.error('MTU too small to send data');
                this.state = _STATE.IDLE
                return false;
            }

            // Get the data chunk to send
            const dataEnd = Math.min(offset + maxDataSize, totalLength);
            const dataChunk = new Uint8Array(samplesBlob.slice(offset, dataEnd));
            log.debug(`Data chunk length: ${dataChunk.byteLength} bytes (from offset ${offset} to ${dataEnd})`);

            // Re-encode the payload with the data included
            payload.data = dataChunk;
            payloadEncoded = this._payloadUploadEncode(payload);
            log.debug(`Payload size after adding data: ${payloadEncoded.byteLength} bytes`);

            if (payloadEncoded.byteLength > maxPayloadSize) {
                log.warning(`Payload too large: ${payloadEncoded.byteLength} > ${maxPayloadSize}`);
                this.state = _STATE.IDLE
                return false;
            }

            try {
                log.debug('Sending payload to mcumgr');
                const response = await this.mcumgr.sendMessage(MGMT_OP.WRITE, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as UploadResponse | ResponseError;
                log.debug('Received response from mcumgr');

                // Check for errors in response
                if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                    log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                    this.state = _STATE.IDLE
                    return false;
                }

                const responseSuccess = response as UploadResponse;
                log.debug(`Response success, new offset: ${responseSuccess.off}`);

                // Update the offset
                offset = responseSuccess.off;

                // Call progress callback if defined
                const progress = Math.floor((offset / totalLength) * 100);
                log.debug(`Upload progress: ${progress}%`);
                uploadProgressUpdate?.(progress);

                // Check if upload is complete
                if (offset >= totalLength) {
                    log.debug('Upload complete');
                    this.state = _STATE.IDLE;
                    break;
                }

            } catch (error) {
                log.error('Error during upload:', error);
                this.state = _STATE.IDLE;
                return false;
            }
        }

        log.debug('Successfully uploaded samples');
        return true;
    }

    async downloadSamples(uploadProgressUpdate?: (percent: Number) => void): Promise<SamplePack | null> {
        log.debug('Starting sample download process');
        if (this.state !== _STATE.IDLE) {
            log.error('Cant start download when not in idle state');
            // return error
            return Promise.reject('Cant start download when not in idle state');
        }

        this.state = _STATE.DOWNLOADING

        let data_raw = new Uint8Array([]);
        let offset = 0;
        let total_length: number = 0;

        // get first chunk with length
        let payload: DownloadRequest = {off: offset};
        let payloadEncoded = this._payloadDownloadEncode(payload);

        try {
            const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as DownloadResponse | ResponseError;
            if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                this.state = _STATE.IDLE;
                return null;
            }

            const responseSuccess = response as DownloadResponse;
            log.debug(`Received first chunk, offset: ${responseSuccess.off}, data length: ${responseSuccess.data.byteLength}`);
            if (responseSuccess.len === undefined) {
                log.error('Length not received in first chunk');
                this.state = _STATE.IDLE;
                return null;
            }
            if (responseSuccess.off !== offset) {
                log.error('Invalid offset received in first chunk');
                this.state = _STATE.IDLE;
                return null;
            }
            data_raw = responseSuccess.data;
            offset = responseSuccess.off + responseSuccess.data.byteLength;
            total_length = responseSuccess.len as number;

            // Call progress callback if defined
            uploadProgressUpdate?.(Math.floor((offset / total_length) * 100));
        } catch (error) {
            log.error('Error during download:', error);
            this.state = _STATE.IDLE;
            return null;
        }

        while (offset < total_length) {
            log.debug(`Current offset: ${offset}, Total length: ${total_length}`);

            // Prepare the payload
            payload = {off: offset};
            payloadEncoded = this._payloadDownloadEncode(payload);

            try {
                const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as DownloadResponse | ResponseError;
                if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                    log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                    this.state = _STATE.IDLE;
                    return null;
                }

                const responseSuccess = response as DownloadResponse;
                log.debug(`Received chunk, offset: ${responseSuccess.off}, data length: ${responseSuccess.data.byteLength}`);
                data_raw = new Uint8Array([...data_raw, ...responseSuccess.data]);
                offset = responseSuccess.off + responseSuccess.data.byteLength;

                // Call progress callback if defined
                uploadProgressUpdate?.(Math.floor((offset / total_length) * 100));

                // Check if download is complete
                if (offset >= total_length) {
                    log.debug('Download complete');
                    this.state = _STATE.IDLE;
                    break;
                }

            } catch (error) {
                log.error('Error during download:', error);
                this.state = _STATE.IDLE;
                return null;
            }
        }

        log.debug('Successfully downloaded samples');

        return Promise.resolve(samplesParser_decode(data_raw));
    }

    private _payloadUploadEncode(payload: UploadRequest): Uint8Array {
        log.debug(`Encoding payload: len=${payload.len}, off=${payload.off}, data=${payload.data.byteLength} bytes`);
        // format: <len: uint32><off: uint32><data: uint8[]>
        const len0 = payload.len & 0xFF;
        const len1 = (payload.len >> 8) & 0xFF;
        const len2 = (payload.len >> 16) & 0xFF;
        const len3 = (payload.len >> 24) & 0xFF;
        const off0 = payload.off & 0xFF;
        const off1 = (payload.off >> 8) & 0xFF;
        const off2 = (payload.off >> 16) & 0xFF;
        const off3 = (payload.off >> 24) & 0xFF;
        const encoded = new Uint8Array([len0, len1, len2, len3, off0, off1, off2, off3, ...payload.data]);
        return encoded;
    }

    private _payloadDownloadEncode(payload: DownloadRequest): Uint8Array {
        log.debug(`Encoding payload: off=${payload.off}`);
        // format: <off: uint32>
        const off0 = payload.off & 0xFF;
        const off1 = (payload.off >> 8) & 0xFF;
        const off2 = (payload.off >> 16) & 0xFF;
        const off3 = (payload.off >> 24) & 0xFF;
        const encoded = new Uint8Array([off0, off1, off2, off3]);
        return encoded;
    }
}

