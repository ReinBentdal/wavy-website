import { MCUManager, MGMT_OP, MGMT_ERR } from './mcumgr';
import { imageHash, Log } from '../utilities'; // Assuming you have an imageHash function
import CBOR from './cbor'; // Assuming you have a CBOR library

let log = new Log('img_mgr', Log.LEVEL_DEBUG);

// Enums for better type safety
enum IMG_MGMT_ID {
    STATE = 0,
    UPLOAD = 1,
    FILE = 2,
    CORELIST = 3,
    CORELOAD = 4,
    ERASE = 5,
}

enum IMG_STATE_TRANSITION {
    START_UPLOAD = 0,
    UPLOAD_COMPLETE = 1,
    UPLOAD_ERROR = 2,
}

enum IMG_STATE {
    IDLE = 0,
    UPLOADING = 1,
}

interface ImageState {
    image?: number; // Semi-optional image number
    slot: number; // Slot number within image (0: primary, 1: secondary)
    version: string; // Image version string
    hash?: Uint8Array; // SHA256 hash of image header and body
    bootable?: boolean; // True if image is bootable
    pending?: boolean; // True if image is set for next swap
    confirmed?: boolean; // True if image has been confirmed
    active?: boolean; // True if image is currently active
    permanent?: boolean; // True if image stays in primary slot after next boot
}

interface ImageStateResponse {
    images: ImageState[];
    splitStatus?: Number; // unused by zephyr
}

interface ImageUploadRequest {
    image?: number; // optional image number, assumed to be 0 if not present
    len?: number; // optional length of an image, must appear when "off" is 0
    off: number; // offset of image chunk the request carries
    sha?: Uint8Array; // SHA256 hash of an upload, must be full SHA256 hash of the whole image, should only be present when "off" is 0
    data: Uint8Array; // image data to write at provided offset
    upgrade?: boolean; // optional flag that states that only upgrade should be allowed, should only be present when "off" is 0
}

interface ImageUploadSuccessResponse {
    off: number; // Offset of last successfully written byte of update
    match?: boolean; // Indicates if the uploaded data matches the provided SHA256 hash
}

interface ImageUploadErrorResponse {
    rc: number; // Error code, only appears if non-zero (error condition)
    rsn?: string; // Optional string that clarifies reason for an error
}

type ImageUploadResponse = ImageUploadSuccessResponse | ImageUploadErrorResponse;

export interface ImageFirmwareVersion {
    versionString: string;
    major: Number;
    minor: Number;
    revision: Number;
}

export const imageIsNewer = (currentVersion: ImageFirmwareVersion, newVersion: ImageFirmwareVersion): boolean => {
    if (newVersion.major > currentVersion.major) {
        return true;
    } else if (newVersion.major === currentVersion.major) {
        if (newVersion.minor > currentVersion.minor) {
            return true;
        } else if (newVersion.minor === currentVersion.minor) {
            if (newVersion.revision > currentVersion.revision) {
                return true;
            }
        }
    }

    return false;
}

class ImageManager {
    private readonly IMAGE_GROUP_ID = 1;
    private state: IMG_STATE = IMG_STATE.IDLE;
    private mcumgr: MCUManager;
    private image: ArrayBuffer | null = null;
    private offset: number = 0;
    private totalLength: number = 0;
    private hash: Uint8Array | null = null;

    constructor(mcumgr: MCUManager) {
        this.mcumgr = mcumgr;
    }

    // Start the image upload process
    async uploadImage(image: ArrayBuffer, uploadProgressUpdate?: (percent: Number) => void): Promise<boolean> {
        if (this.state === IMG_STATE.UPLOADING) {
            log.error('Upload already in progress');
            return;
        }
        this.state = IMG_STATE.UPLOADING;

        this.image = image;
        this.offset = 0;
        this.totalLength = image.byteLength;

        try {
            // Compute image hash
            this.hash = new Uint8Array(await imageHash(image));

            // Start uploading chunks
            const maxPayloadSize = this.mcumgr.maxPayloadSize; // Max payload size from MCUManager
        
            while (this.offset < this.totalLength) {
                // Prepare the payload
                let payload: ImageUploadRequest = {
                    off: this.offset,
                    data: new Uint8Array([]),
                };
        
                if (this.offset === 0) {
                    log.debug('Starting image upload');
                    // First chunk includes length and hash
                    payload.len = this.totalLength;
                    payload.sha = this.hash;
                }
        
                // Encode the initial payload to determine its length
                let encodedPayload = CBOR.encode(payload);
                const initialPayloadLength = encodedPayload.byteLength;
                
                log.debug(`maxPayloadSize: ${maxPayloadSize}, initialPayloadLength: ${initialPayloadLength}`);
        
                // Calculate the maximum data size that fits within the MTU
                const maxDataSize = maxPayloadSize - initialPayloadLength - 20;
                if (maxDataSize <= 0) {
                    log.error('MTU too small to send data');
                    this.state = IMG_STATE.IDLE;
                    return false;
                }
        
                // Get the data chunk to send
                const dataEnd = Math.min(this.offset + maxDataSize, this.totalLength);
                const dataChunk = new Uint8Array(this.image!.slice(this.offset, dataEnd));
                payload.data = dataChunk;
        
                // Re-encode the payload with the data included
                encodedPayload = CBOR.encode(payload);
                if (encodedPayload.byteLength > maxPayloadSize) {
                    log.warn(`Payload too large: ${encodedPayload.byteLength} > ${maxPayloadSize}`);
                    // this.state = IMG_STATE.IDLE;
                    // return false;
                }
        

                const response = await this.mcumgr.sendMessage(
                    MGMT_OP.WRITE,
                    this.IMAGE_GROUP_ID,
                    IMG_MGMT_ID.UPLOAD,
                    new Uint8Array(encodedPayload)
                ) as ImageUploadResponse;
    
                // Check for errors, map to either success or error response interface
                if ((response as ImageUploadErrorResponse).rc !== undefined && (response as ImageUploadErrorResponse).rc !== MGMT_ERR.EOK) {
                    this.state = IMG_STATE.IDLE;
                    return false;
                }
    
                const responseSuccess = response as ImageUploadSuccessResponse;
    
                this.offset = responseSuccess.off;
                uploadProgressUpdate?.(Math.floor((this.offset / this.totalLength) * 100));
            }
        
            this.state = IMG_STATE.IDLE;
            return true;
        } catch (error) {
            log.error('Error during image upload:', error);
            this.state = IMG_STATE.IDLE;
            return false;
        }
    }
    
    async getFirmwareVersion(): Promise<ImageFirmwareVersion> {
        const response = await this.mcumgr.sendMessage(MGMT_OP.READ, this.IMAGE_GROUP_ID, IMG_MGMT_ID.STATE) as ImageStateResponse;

        if (response.images === undefined || response.images.length === 0) {
            throw new Error('No image state found');
        }

        // find which of the images are the active one
        const activeImage = response.images.find(image => image.active);

        if (!activeImage) {
            throw new Error('Device does not use Image Manager');
        }

        const version = activeImage.version.split('.').map(Number);
        return {
            versionString: activeImage.version,
            major: version[0],
            minor: version[1],
            revision: version[2],
        };
    }
}

export { ImageManager };
