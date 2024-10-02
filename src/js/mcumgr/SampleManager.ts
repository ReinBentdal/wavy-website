import { MCUManager, MGMT_OP, MGMT_ERR, ResponseError } from './mcumgr';
import { Log } from '../utilities'; // Assuming you have an imageHash function
import { samplesParser_encode, SamplePack, samplesParser_decode } from '../parsers/samples_parser';

let log = new Log('smpl_mgr', Log.LEVEL_DEBUG);

// Enums for better type safety
enum _MGMT_ID {
    UPLOAD = 0,
}

enum _STATE_TRANSITION {
    START_UPLOAD,
    START_DOWNLOAD,
    TRANSFER_COMPLETE,
    TRANSFER_ERROR,
}

enum _STATE {
    IDLE,
    UPLOADING,
    DOWNLOADING,
}

interface UploadRequest {
    len: number; // optional length of an image, must appear when "off" is 0
    off: number; // offset of image chunk the request carries
    data: Uint8Array; // image data to write at provided offset
}

interface UploadSuccessResponse {
    off: number; // Offset of last successfully written byte of update
}

type UploadResponse = UploadSuccessResponse | ResponseError;

interface DownloadRequest {
    off: number;
}

interface DownloadResponseSuccess {
    len?: number;
    off: number;
    data: Uint8Array;
}

type DownloadResponse = DownloadResponseSuccess | ResponseError;

export class SampleManager {
    private readonly GROUP_ID = 100;
    private state: _STATE = _STATE.IDLE;
    private mcumgr: MCUManager;

    private onUploadProgressCallback: ((percent: number) => void) | null = null;
    private onUploadCompleteCallback: ((success: boolean) => void) | null = null;
    private onUploadStartedCallback: (() => void) | null = null;

    private onDownloadProgressCallback: ((percent: number) => void) | null = null;
    private onDownloadCompleteCallback: ((success: boolean) => void) | null = null;
    private onDownloadStartedCallback: (() => void) | null = null;

    constructor(mcumgr: MCUManager) {
        this.mcumgr = mcumgr;
    }

    // Callback for upload progress
    onUploadProgress(fn: (percent: number) => void): this {
        this.onUploadProgressCallback = fn;
        return this;
    }

    // Callback for upload completion
    onUploadComplete(fn: (success: boolean) => void): this {
        this.onUploadCompleteCallback = fn;
        return this;
    }

    // Callback for upload start
    onUploadStarted(fn: () => void): this {
        this.onUploadStartedCallback = fn;
        return this;
    }

    // Start the image upload process
    async uploadSamples(image: SamplePack): Promise<boolean> {
        log.debug('Starting sample upload process');
        if (this.state !== _STATE.IDLE) {
            log.error('Cant start upload when not in idle state');
            return Promise.reject('Cant start upload when not in idle state');
        }

        this._setState(_STATE_TRANSITION.START_UPLOAD);
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
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return false;
            }

            // Get the data chunk to send
            const dataEnd = Math.min(offset + maxDataSize, totalLength);
            const dataChunk = new Uint8Array(samplesBlob!.slice(offset, dataEnd));
            log.debug(`Data chunk length: ${dataChunk.byteLength} bytes (from offset ${offset} to ${dataEnd})`);

            // Re-encode the payload with the data included
            payload.data = dataChunk;
            payloadEncoded = this._payloadUploadEncode(payload);
            log.debug(`Payload size after adding data: ${payloadEncoded.byteLength} bytes`);

            if (payloadEncoded.byteLength > maxPayloadSize) {
                log.warn(`Payload too large: ${payloadEncoded.byteLength} > ${maxPayloadSize}`);
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return false;
            }

            try {
                log.debug('Sending payload to mcumgr');
                const response = await this.mcumgr.sendMessage(MGMT_OP.WRITE, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as UploadResponse;
                log.debug('Received response from mcumgr');

                // Check for errors in response
                if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                    log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                    this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                    return false;
                }

                const responseSuccess = response as UploadSuccessResponse;
                log.debug(`Response success, new offset: ${responseSuccess.off}`);

                // Update the offset
                offset = responseSuccess.off;

                // Call progress callback if defined
                const progress = Math.floor((offset / totalLength) * 100);
                log.debug(`Upload progress: ${progress}%`);
                this.onUploadProgressCallback?.(progress);

                // Check if upload is complete
                if (offset >= totalLength) {
                    log.debug('Upload complete');
                    this._setState(_STATE_TRANSITION.TRANSFER_COMPLETE);
                    break;
                }

            } catch (error) {
                log.error('Error during upload:', error);
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return false;
            }
        }

        log.debug('Successfully uploaded samples');
        return true;
    }

    onDownloadProgress(fn: (percent: number) => void): this {
        this.onDownloadProgressCallback = fn;
        return this;
    }

    onDownloadComplete(fn: (success: boolean) => void): this {
        this.onDownloadCompleteCallback = fn;
        return this;
    }

    onDownloadStarted(fn: () => void): this {
        this.onDownloadStartedCallback = fn;
        return this;
    }

    async downloadSamples(): Promise<SamplePack> {
        log.debug('Starting sample download process');
        if (this.state !== _STATE.IDLE) {
            log.error('Cant start download when not in idle state');
            // return error
            return Promise.reject('Cant start download when not in idle state');
        }

        this._setState(_STATE_TRANSITION.START_DOWNLOAD);

        let data_raw = new Uint8Array([]);
        let offset = 0;
        let total_length: number = 0;

        // get first chunk with length
        let payload: DownloadRequest = {off: offset};
        let payloadEncoded = this._payloadDownloadEncode(payload);

        try {
            const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as DownloadResponse;
            if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return Promise.reject('Error response received');
            }

            const responseSuccess = response as DownloadResponseSuccess;
            log.debug(`Received first chunk, offset: ${responseSuccess.off}, data length: ${responseSuccess.data.byteLength}`);
            if (responseSuccess.len === undefined) {
                log.error('Length not received in first chunk');
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return Promise.reject('Length not received in first chunk');
            }
            if (responseSuccess.off !== offset) {
                log.error('Invalid offset received in first chunk');
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return Promise.reject('Invalid offset received in first chunk');
            }
            data_raw = responseSuccess.data;
            offset = responseSuccess.off + responseSuccess.data.byteLength;
            total_length = responseSuccess.len as number;

            // Call progress callback if defined
            this.onDownloadProgressCallback?.(Math.floor((offset / total_length) * 100));
        } catch (error) {
            log.error('Error during download:', error);
            this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
            return Promise.reject('Error during download');
        }

        while (offset < total_length) {
            log.debug(`Current offset: ${offset}, Total length: ${total_length}`);

            // Prepare the payload
            payload = {off: offset};
            payloadEncoded = this._payloadDownloadEncode(payload);

            try {
                const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as DownloadResponse;
                if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                    log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                    this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                    return Promise.reject('Error response received');
                }

                const responseSuccess = response as DownloadResponseSuccess;
                log.debug(`Received chunk, offset: ${responseSuccess.off}, data length: ${responseSuccess.data.byteLength}`);
                data_raw = new Uint8Array([...data_raw, ...responseSuccess.data]);
                offset = responseSuccess.off + responseSuccess.data.byteLength;

                // Call progress callback if defined
                this.onDownloadProgressCallback?.(Math.floor((offset / total_length) * 100));

                // Check if download is complete
                if (offset >= total_length) {
                    log.debug('Download complete');
                    this._setState(_STATE_TRANSITION.TRANSFER_COMPLETE);
                    break;
                }

            } catch (error) {
                log.error('Error during download:', error);
                this._setState(_STATE_TRANSITION.TRANSFER_ERROR);
                return Promise.reject('Error during download');
            }
        }

        log.debug('Successfully downloaded samples');

        return Promise.resolve(samplesParser_decode(data_raw));
    }

    private _setState(stateTransition: _STATE_TRANSITION): void {
        switch (stateTransition) {
            case _STATE_TRANSITION.START_UPLOAD:
                if (this.state === _STATE.UPLOADING) {
                    log.error('Upload already in progress');
                    return;
                }
                this.state = _STATE.UPLOADING;
                this.onUploadStartedCallback?.();
                break;

                case _STATE_TRANSITION.START_DOWNLOAD:
                    if (this.state === _STATE.DOWNLOADING) {
                        log.error('Download already in progress');
                        return;
                    }
                    this.state = _STATE.DOWNLOADING;
                    this.onDownloadStartedCallback?.();
                    break;

            case _STATE_TRANSITION.TRANSFER_COMPLETE:
                if (this.state === _STATE.UPLOADING) {
                    this.onUploadCompleteCallback?.(true);
                } else if (this.state === _STATE.DOWNLOADING) {
                    this.onDownloadCompleteCallback?.(true);
                } else {
                    log.error('Transfer complete but not in upload or download state');
                }
                this.state = _STATE.IDLE;
                break;

            case _STATE_TRANSITION.TRANSFER_ERROR:
                if (this.state === _STATE.UPLOADING) {
                    this.onUploadCompleteCallback?.(false);
                } else if (this.state === _STATE.DOWNLOADING) {
                    this.onDownloadCompleteCallback?.(false);
                } else {
                    log.error('Transfer error but not in upload or download state');
                }
                this.state = _STATE.IDLE;
                break;

            default:
                log.error('Unknown state transition');
                break;
        }
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

