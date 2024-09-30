import { MCUManager, MGMT_OP, MGMT_ERR, ResponseError } from './mcumgr';
import { Log } from '../utilities'; // Assuming you have an imageHash function
import { samplesParser_encode, Samples } from '../parsers/samples_parser';

let log = new Log('smpl_mgr', Log.LEVEL_DEBUG);

// Enums for better type safety
enum _MGMT_ID {
    UPLOAD = 0,
}

enum _STATE_TRANSITION {
    START_UPLOAD = 0,
    UPLOAD_COMPLETE = 1,
    UPLOAD_ERROR = 2,
}

enum _STATE {
    IDLE = 0,
    UPLOADING = 1,
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

export class SampleManager {
    private readonly GROUP_ID = 100;
    private state: _STATE = _STATE.IDLE;
    private mcumgr: MCUManager;
    private samplesBlob: ArrayBuffer | null = null;
    private offset: number = 0;
    private totalLength: number = 0;

    private onUploadProgressCallback: ((percent: number) => void) | null = null;
    private onUploadCompleteCallback: ((success: boolean) => void) | null = null;
    private onUploadStartedCallback: (() => void) | null = null;

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
    async uploadSamples(image: Samples): Promise<void> {
        log.debug('Starting sample upload process');
        if (this.state === _STATE.UPLOADING) {
            log.error('Upload already in progress');
            return;
        }

        log.debug('Parsing image into byte array');
        this.samplesBlob = samplesParser_encode(image);
        this.offset = 0;
        this.totalLength = this.samplesBlob.byteLength;
        log.debug(`Total sample length: ${this.totalLength} bytes`);

        try {
            await this._uploadLoop();
        } catch (error) {
            log.error('Error during image upload:', error);
            this._setState(_STATE_TRANSITION.UPLOAD_ERROR);
        }
    }

    // Upload the next chunks of the image using a loop
    private async _uploadLoop(): Promise<void> {
        const maxPayloadSize = this.mcumgr.maxPayloadSize; // Max payload size from MCUManager
        log.debug(`Max payload size: ${maxPayloadSize} bytes`);

        this._setState(_STATE_TRANSITION.START_UPLOAD);
        log.debug('Entering upload loop');

        while (this.state === _STATE.UPLOADING && this.offset < this.totalLength) {
            log.debug(`Current offset: ${this.offset}, Total length: ${this.totalLength}`);

            // Prepare the initial payload
            let payload: UploadRequest = {
                off: this.offset,
                data: new Uint8Array([]),
                len: this.totalLength,
            };
            let payloadEncoded = this._payloadEncode(payload);
            log.debug(`Initial payload size (without data): ${payloadEncoded.byteLength} bytes`);

            // Calculate the maximum data size that fits within the MTU
            const maxDataSize = maxPayloadSize - payloadEncoded.byteLength - 20;
            log.debug(`Max data size for this chunk: ${maxDataSize} bytes`);

            if (maxDataSize <= 0) {
                log.error('MTU too small to send data');
                this._setState(_STATE_TRANSITION.UPLOAD_ERROR);
                return;
            }

            // Get the data chunk to send
            const dataEnd = Math.min(this.offset + maxDataSize, this.totalLength);
            const dataChunk = new Uint8Array(this.samplesBlob!.slice(this.offset, dataEnd));
            log.debug(`Data chunk length: ${dataChunk.byteLength} bytes (from offset ${this.offset} to ${dataEnd})`);

            // Re-encode the payload with the data included
            payload.data = dataChunk;
            payloadEncoded = this._payloadEncode(payload);
            log.debug(`Payload size after adding data: ${payloadEncoded.byteLength} bytes`);

            if (payloadEncoded.byteLength > maxPayloadSize) {
                log.warn(`Payload too large: ${payloadEncoded.byteLength} > ${maxPayloadSize}`);
                this._setState(_STATE_TRANSITION.UPLOAD_ERROR);
                return;
            }

            try {
                log.debug('Sending payload to mcumgr');
                const response = await this.mcumgr.sendMessage(MGMT_OP.WRITE, this.GROUP_ID, _MGMT_ID.UPLOAD, payloadEncoded) as UploadResponse;
                log.debug('Received response from mcumgr');

                // Check for errors in response
                if ((response as ResponseError).rc !== undefined && (response as ResponseError).rc !== MGMT_ERR.EOK) {
                    log.error(`Error response received, rc: ${(response as ResponseError).rc}`);
                    this._setState(_STATE_TRANSITION.UPLOAD_ERROR);
                    break;
                }

                const responseSuccess = response as UploadSuccessResponse;
                log.debug(`Response success, new offset: ${responseSuccess.off}`);

                // Update the offset
                this.offset = responseSuccess.off;

                // Call progress callback if defined
                const progress = Math.floor((this.offset / this.totalLength) * 100);
                log.debug(`Upload progress: ${progress}%`);
                this.onUploadProgressCallback?.(progress);

                // Check if upload is complete
                if (this.offset >= this.totalLength) {
                    log.debug('Upload complete');
                    this._setState(_STATE_TRANSITION.UPLOAD_COMPLETE);
                    break;
                }

            } catch (error) {
                log.error('Error during upload:', error);
                this._setState(_STATE_TRANSITION.UPLOAD_ERROR);
                break;
            }
        }

        log.debug('Exiting upload loop');
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

            case _STATE_TRANSITION.UPLOAD_COMPLETE:
                if (this.state !== _STATE.UPLOADING) {
                    log.error('Upload not in progress');
                    return;
                }
                this.state = _STATE.IDLE;
                this.onUploadCompleteCallback?.(true);
                break;

            case _STATE_TRANSITION.UPLOAD_ERROR:
                if (this.state !== _STATE.UPLOADING) {
                    log.error('Upload not in progress');
                    return;
                }
                this.state = _STATE.IDLE;
                this.onUploadCompleteCallback?.(false);
                break;

            default:
                log.error('Unknown state transition');
                break;
        }
    }

    private _payloadEncode(payload: UploadRequest): Uint8Array {
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
}

