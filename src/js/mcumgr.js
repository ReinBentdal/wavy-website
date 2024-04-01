// MIT License

// Copyright (c) 2022 Andras Barthazi

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { CBOR } from './cbor.js'

// Define groups as objects
export const MGMT_OP = {
    READ: 0,
    READ_RSP: 1,
    WRITE: 2,
    WRITE_RSP: 3,
};

export const MGMT_GROUP_ID = {
    OS: 0,
    IMAGE: 1,
    STAT: 2,
    CONFIG: 3,
    LOG: 4,
    CRASH: 5,
    SPLIT: 6,
    RUN: 7,
    FS: 8,
    SHELL: 9,
};

// OS group specifics
export const OS_MGMT_ID = {
    ECHO: 0,
    CONS_ECHO_CTRL: 1,
    TASKSTAT: 2,
    MPSTAT: 3,
    DATETIME_STR: 4,
    RESET: 5,
};

// Image group specifics
export const IMG_MGMT_ID = {
    STATE: 0,
    UPLOAD: 1,
    FILE: 2,
    CORELIST: 3,
    CORELOAD: 4,
    ERASE: 5,
};

class MCUManager {
    constructor(di = {}) {
        this.SMP_SERVICE_UUID = '8d53dc1d-1db7-4cd3-868b-8a527460aa84';
        this.SMP_CHARACTERISTIC_UUID = 'da2e7828-fbce-4e01-ae9e-261174997c48';
        this._mtu = 140;
        this._device = null;
        this._service = null;
        this._characteristic = null;
        this._connectCallback = null;
        this._connectingCallback = null;
        this._disconnectCallback = null;
        this._messageCallback = null;
        this._imageUploadProgressCallback = null;
        this._uploadIsInProgress = false;
        this._buffer = new Uint8Array();
        this._logger = di.logger || { info: console.log, error: console.error };
        this._seq = 0;
        this._userRequestedDisconnect = false;
    }
    async _requestDevice(filters) {
        const params = {
            acceptAllDevices: false,
            optionalServices: [this.SMP_SERVICE_UUID]
        };
        if (filters) {
            params.filters = filters;
            params.acceptAllDevices = false;
        }
        return navigator.bluetooth.requestDevice(params);
    }
    async connect(filters) {
        try {
            this._device = await this._requestDevice(filters);
            this._logger.info(`Connecting to device ${this.name}...`);
            this._device.addEventListener('gattserverdisconnected', async event => {
                this._logger.info(event);
                if (!this._userRequestedDisconnect) {
                    this._logger.info('Trying to reconnect');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this._connect();
                } else {
                    this._disconnected();
                }
            });
            await this._connect();
        } catch (error) {
            this._logger.error(error);
            await this._disconnected();
            return;
        }
    }
    async _connect() {
        try {
            if (this._connectingCallback) this._connectingCallback();
            const server = await this._device.gatt.connect();
            this._logger.info(`Server connected.`);
            this._service = await server.getPrimaryService(this.SMP_SERVICE_UUID);
            this._logger.info(`Service connected.`);
            this._characteristic = await this._service.getCharacteristic(this.SMP_CHARACTERISTIC_UUID);
            this._characteristic.addEventListener('characteristicvaluechanged', this._notification.bind(this));
            await this._characteristic.startNotifications();
            await this._connected();
            if (this._uploadIsInProgress) {
                this._uploadNext();
            }
        } catch (error) {
            this._logger.error(error);
            await this._disconnected();
        }
    }
    disconnect() {
        this._userRequestedDisconnect = true;
        return this._device.gatt.disconnect();
    }
    onConnecting(callback) {
        this._connectingCallback = callback;
        return this;
    }
    onConnect(callback) {
        this._connectCallback = callback;
        return this;
    }
    onDisconnect(callback) {
        this._disconnectCallback = callback;
        return this;
    }
    onMessage(callback) {
        this._messageCallback = callback;
        return this;
    }
    onImageUploadProgress(callback) {
        this._imageUploadProgressCallback = callback;
        return this;
    }
    onImageUploadFinished(callback) {
        this._imageUploadFinishedCallback = callback;
        return this;
    }
    async _connected() {
        if (this._connectCallback) this._connectCallback();
    }
    async _disconnected() {
        this._logger.info('Disconnected.');
        if (this._disconnectCallback) this._disconnectCallback();
        this._device = null;
        this._service = null;
        this._characteristic = null;
        this._uploadIsInProgress = false;
        this._userRequestedDisconnect = false;
    }
    get name() {
        return this._device && this._device.name;
    }
    async _sendMessage(op, group, id, data) {
        const _flags = 0;
        let encodedData = [];
        if (typeof data !== 'undefined') {
            encodedData = [...new Uint8Array(CBOR.encode(data))];
        }
        const length_lo = encodedData.length & 255;
        const length_hi = encodedData.length >> 8;
        const group_lo = group & 255;
        const group_hi = group >> 8;
        const message = [op, _flags, length_hi, length_lo, group_hi, group_lo, this._seq, id, ...encodedData];
        // console.log('>'  + message.map(x => x.toString(16).padStart(2, '0')).join(' '));
        await this._characteristic.writeValueWithoutResponse(Uint8Array.from(message));
        this._seq = (this._seq + 1) % 256;
    }
    _notification(event) {
        // console.log('message received');
        const message = new Uint8Array(event.target.value.buffer);
        // console.log(message);
        // console.log('<'  + [...message].map(x => x.toString(16).padStart(2, '0')).join(' '));
        this._buffer = new Uint8Array([...this._buffer, ...message]);
        const messageLength = this._buffer[2] * 256 + this._buffer[3];
        if (this._buffer.length < messageLength + 8) return;
        this._processMessage(this._buffer.slice(0, messageLength + 8));
        this._buffer = this._buffer.slice(messageLength + 8);
    }
    _processMessage(message) {
        const [op, _flags, length_hi, length_lo, group_hi, group_lo, _seq, id] = message;
        const data = CBOR.decode(message.slice(8).buffer);
        const length = length_hi * 256 + length_lo;
        const group = group_hi * 256 + group_lo;
        if (group === MGMT_GROUP_ID.IMAGE && id === IMG_MGMT_ID.UPLOAD && (data.rc === 0 || data.rc === undefined) && data.off) {
            this._uploadOffset = data.off;
            this._uploadNext();
            return;
        }
        if (this._messageCallback) this._messageCallback({ op, group, id, data, length });
    }
    cmdReset() {
        return this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.OS, OS_MGMT_ID.RESET);
    }
    smpEcho(message) {
        return this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.OS, OS_MGMT_ID.ECHO, { d: message });
    }
    cmdImageState() {
        return this._sendMessage(MGMT_OP.READ, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE);
    }
    cmdImageErase() {
        return this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.ERASE, {});
    }
    cmdImageTest(hash) {
        return this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE, { hash, confirm: false });
    }
    cmdImageConfirm(hash) {
        return this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE, { hash, confirm: true });
    }    
    _hash(image) {
        return crypto.subtle.digest('SHA-256', image);
    }
    async _uploadNext() {
        if (this._uploadOffset >= this._uploadImage.byteLength) {
            this._uploadIsInProgress = false;
            this._imageUploadFinishedCallback();
            return;
        }

        const nmpOverhead = 8;
        const message = { data: new Uint8Array(), off: this._uploadOffset };
        if (this._uploadOffset === 0) {
            message.len = this._uploadImage.byteLength;
            message.sha = new Uint8Array(await this._hash(this._uploadImage));
        }
        this._imageUploadProgressCallback({ percentage: Math.floor(this._uploadOffset / this._uploadImage.byteLength * 100) });

        const length = this._mtu - CBOR.encode(message).byteLength - nmpOverhead;

        message.data = new Uint8Array(this._uploadImage.slice(this._uploadOffset, this._uploadOffset + length));

        this._uploadOffset += length;

        this._sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.UPLOAD, message);
    }
    async cmdUpload(image, slot = 0) {
        if (this._uploadIsInProgress) {
            this._logger.error('Upload is already in progress.');
            return;
        }
        this._uploadIsInProgress = true;

        this._uploadOffset = 0;
        this._uploadImage = image;
        this._uploadSlot = slot;

        this._uploadNext();
    }
    async imageInfo(image) {
        // https://interrupt.memfault.com/blog/mcuboot-overview#mcuboot-image-binaries

        const info = {};
        const view = new Uint8Array(image);

        // check header length
        if (view.length < 32) {
            throw new Error('Invalid image (too short file)');
        }

        // check MAGIC bytes 0x96f3b83d
        if (view[0] !== 0x3d || view[1] !== 0xb8 || view[2] !== 0xf3 || view[3] !== 0x96) {
            throw new Error('Invalid image (wrong magic bytes)');
        }

        // check load address is 0x00000000
        if (view[4] !== 0x00 || view[5] !== 0x00 || view[6] !== 0x00 || view[7] !== 0x00) {
            throw new Error('Invalid image (wrong load address)');
        }

        const headerSize = view[8] + view[9] * 2 ** 8;

        // check protected TLV area size is 0
        if (view[10] !== 0x00 || view[11] !== 0x00) {
            throw new Error('Invalid image (wrong protected TLV area size)');
        }

        const imageSize = view[12] + view[13] * 2 ** 8 + view[14] * 2 ** 16 + view[15] * 2 ** 24;
        info.imageSize = imageSize;

        // check image size is correct
        if (view.length < imageSize + headerSize) {
            throw new Error('Invalid image (wrong image size)');
        }

        // check flags is 0x00000000
        if (view[16] !== 0x00 || view[17] !== 0x00 || view[18] !== 0x00 || view[19] !== 0x00) {
            throw new Error('Invalid image (wrong flags)');
        }

        const version = `${view[20]}.${view[21]}.${view[22] + view[23] * 2 ** 8}`;
        info.version = version;

        info.hash = [...new Uint8Array(await this._hash(image.slice(0, imageSize + 32)))].map(b => b.toString(16).padStart(2, '0')).join('');

        return info;
    }
}

export { MCUManager };