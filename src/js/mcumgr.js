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
import { assert, imageHash, Log } from './utilities.js'

let log = new Log('MCUManager', Log.LEVEL_DEBUG);

export const SMP_ERR_RC = {
    0: 'No error, OK.',
    1: 'Unknown error.',
    2: 'Not enough memory; this error is reported when there is not enough memory to complete response.',
    3: 'Invalid value; a request contains an invalid value.',
    4: 'Timeout; the operation for some reason could not be completed in assumed time.',
    5: 'No entry; the error means that request frame has been missing some information that is required to perform action. It may also mean that requested information is not available.',
    6: 'Bad state; the error means that application or device is in a state that would not allow it to perform or complete a requested action.',
    7: 'Response too long; this error is issued when buffer assigned for gathering response is not big enough.',
    8: 'Not supported; usually issued when requested Group ID or Command ID is not supported by application.',
    9: 'Corrupted payload received.',
    10: 'Device is busy with processing previous SMP request and may not process incoming one. Client should re-try later.',
    256: 'This is base error number of user defined error codes.'
};

// Define groups as objects
export const MGMT_OP = {
    READ: 0,
    READ_RSP: 1,
    WRITE: 2,
    WRITE_RSP: 3,
};

export const MGMT_OP_REVERSE = Object.fromEntries(
    Object.entries(MGMT_OP).map(([key, value]) => [value, key])
);

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
    #userRequestedDisconnect;
    #mtu;
    #device;
    #service;
    #characteristic;
    #connectCallback;
    #connectingCallback;
    #disconnectCallback;
    #connectionLossCallback;
    #messageCallback;
    #imageUploadProgressCallback;
    #uploadIsInProgress;
    #buffer;
    #smp_sequence_number;
    #uploadOffset;
    #uploadImage;
    #uploadSlot;
    #imageUploadFinishedCallback;

    constructor(di = {}) {
        this.SMP_SERVICE_UUID = '8d53dc1d-1db7-4cd3-868b-8a527460aa84';
        this.SMP_CHARACTERISTIC_UUID = 'da2e7828-fbce-4e01-ae9e-261174997c48';
        this.SMP_HEADER_SIZE = 8;
        this.#mtu = 140;
        this.#device = null;
        this.#service = null;
        this.#characteristic = null;
        this.#connectCallback = null;
        this.#connectingCallback = null;
        this.#disconnectCallback = null;
        this.#connectionLossCallback = null;
        this.#messageCallback = null;
        this.#imageUploadProgressCallback = null;
        this.#uploadIsInProgress = false;
        this.#buffer = new Uint8Array();
        this.#smp_sequence_number = 0;
        this.#userRequestedDisconnect = false;
    }

    async #requestDevice(filters) {
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
            this.#device = await this.#requestDevice(filters);
            log.debug(`Connecting to device ${this.name}...`);
            this.#device.addEventListener('gattserverdisconnected', async event => {
                log.debug(event);
                if (this.#userRequestedDisconnect === false) {
                    log.debug('Trying to reconnect');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (this.#connectionLossCallback) this.#connectionLossCallback();
                    await this.#connect();
                } else {
                    this.#disconnected();
                }
            });
            await this.#connect();
        } catch (error) {
            log.error(error);
            await this.#disconnected();
            return;
        }
    }

    async #connect() {
        try {
            if (this.#connectingCallback) this.#connectingCallback();
            const server = await this.#device.gatt.connect();
            log.debug(`Server connected. Awaiting SMP service...`);
            this.#service = await server.getPrimaryService(this.SMP_SERVICE_UUID);
            log.debug(`Service connected.`);
            this.#characteristic = await this.#service.getCharacteristic(this.SMP_CHARACTERISTIC_UUID);
            this.#characteristic.addEventListener('characteristicvaluechanged', this.#notification.bind(this));
            await this.#characteristic.startNotifications();
            await this.#connected();
            if (this.#uploadIsInProgress) {
                this.#uploadNext();
            }
        } catch (error) {
            log.error(error);
            await this.#disconnected();
        }
    }

    disconnect() {
        this.#userRequestedDisconnect = true;
        return this.#device.gatt.disconnect();
    }

    onConnecting(callback) {
        this.#connectingCallback = callback;
        return this;
    }
    
    onConnect(callback) {
        this.#connectCallback = callback;
        return this;
    }
    
    onDisconnect(callback) {
        this.#disconnectCallback = callback;
        return this;
    }
    
    onConnectionLoss(callback) {
        this.#connectionLossCallback = callback;
        return this;
    }
    
    onMessage(callback) {
        this.#messageCallback = callback;
        return this;
    }
    
    onImageUploadProgress(callback) {
        this.#imageUploadProgressCallback = callback;
        return this;
    }

    onImageUploadFinished(callback) {
        this.#imageUploadFinishedCallback = callback;
        return this;
    }

    async #connected() {
        if (this.#connectCallback) this.#connectCallback();
    }

    async #disconnected() {
        log.debug('Disconnected.');
        if (this.#disconnectCallback) this.#disconnectCallback();
        this.#device = null;
        this.#service = null;
        this.#characteristic = null;
        this.#uploadIsInProgress = false;
        this.#userRequestedDisconnect = false;
    }

    get name() {
        return this.#device && this.#device.name;
    }

    /* commands */
    cmdReset() {
        return this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.OS, OS_MGMT_ID.RESET);
    }
    smpEcho(message) {
        return this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.OS, OS_MGMT_ID.ECHO, { d: message });
    }
    cmdImageState() {
        return this.#sendMessage(MGMT_OP.READ, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE);
    }
    cmdImageErase() {
        return this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.ERASE, {});
    }
    cmdImageTest(hash) {
        return this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE, { hash, confirm: false });
    }
    cmdImageConfirm(hash) {
        return this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.STATE, { hash, confirm: true });
    }
    cmdCustom(group, id, op, data, cborEncodeed = true) {
        return this.#sendMessage(op, group, id, data, cborEncodeed);
    }

    async cmdUpload(image, slot = 0) {
        if (this.#uploadIsInProgress) {
            log.error('Upload is already in progress.');
            return;
        }
        this.#uploadIsInProgress = true;

        this.#uploadOffset = 0;
        this.#uploadImage = image;
        this.#uploadSlot = slot;

        this.#uploadNext();
    }

    #notification(event) {
        const message = new Uint8Array(event.target.value.buffer);
        this.#buffer = new Uint8Array([...this.#buffer, ...message]);
        const messageLength = this.#buffer[2] * 256 + this.#buffer[3];
        if (this.#buffer.length < messageLength + 8) return;
        this.#processMessage(this.#buffer.slice(0, messageLength + 8));
        this.#buffer = this.#buffer.slice(messageLength + 8);
    }
    
    async #uploadNext() {
        if (this.#uploadOffset >= this.#uploadImage.byteLength) {
            this.#uploadIsInProgress = false;
            this.#imageUploadFinishedCallback();
            return;
        }
        
        const message = { data: new Uint8Array(), off: this.#uploadOffset };
        if (this.#uploadOffset === 0) {
            message.len = this.#uploadImage.byteLength;
            message.sha = new Uint8Array(await imageHash(this.#uploadImage));
        }
        
        /* workaround to get length before encoding */
        const length = this.#mtu - CBOR.encode(message).byteLength - this.SMP_HEADER_SIZE;
        
        message.data = new Uint8Array(this.#uploadImage.slice(this.#uploadOffset, this.#uploadOffset + length));
        
        this.#uploadOffset += length;
        
        this.#sendMessage(MGMT_OP.WRITE, MGMT_GROUP_ID.IMAGE, IMG_MGMT_ID.UPLOAD, message);

        if (this.#imageUploadProgressCallback) {
            this.#imageUploadProgressCallback({ percentage: Math.floor(this.#uploadOffset / this.#uploadImage.byteLength * 100) });
        }
    }

    #processMessage(message) {
        const [op, _flags, length_hi, length_lo, group_hi, group_lo, _seq, id] = message;
        const data = CBOR.decode(message.slice(8).buffer);
        const length = length_hi * 256 + length_lo;
        const group = group_hi * 256 + group_lo;

        /* automatically upload next block if peripheral returns it successfully processed previous block */ 
        if (group === MGMT_GROUP_ID.IMAGE && id === IMG_MGMT_ID.UPLOAD && (data.rc === 0 || data.rc === undefined) && data.off) {
            log.debug(`Block uploaded successfully, offset: ${data.off}`);
            this.#uploadOffset = data.off;
            this.#uploadNext();
            return;
        }
        
        if (this.#messageCallback) this.#messageCallback({ op, group, id, data, length });
    }

    // data must be of type Uint8Array
    async #sendMessage(op, group, group_cmd_id, data, cborEncode = true) {    
        /* SMP currently does not use flags. Keep empty */
        let data_provided = typeof data !== 'undefined';
        
        var encodedData = [];
        if (data_provided) {
            if (cborEncode) {
                encodedData = [...new Uint8Array(CBOR.encode(data))];
            } else {
                encodedData = data;
            }
        }
        let header = this.#smpHeaderConstruct(op, group, group_cmd_id, encodedData);

        /* Message in bytes, see info here: https://docs.zephyrproject.org/latest/services/device_mgmt/smp_protocol.html */
        const message = [...header, ...encodedData];
        this.#smp_sequence_number = (this.#smp_sequence_number + 1) % 256;

        log.debug(`Sending message:`);
        let log_message = {
            header: header,
            data: encodedData,
        }
        log.debug(log_message);

        await this.#characteristic.writeValueWithoutResponse(Uint8Array.from(message));
    }

    #smpHeaderConstruct(op, group, group_cmd_id, encodedData) {
        const smp_flags = 0;
        const data_size_lo = encodedData.length & 255; // lower 8 bit
        const data_size_hi = encodedData.length >> 8; // upper 8 bit
        assert(data_size_hi < 256, 'Message too long');
        const group_lo = group & 255;
        const group_hi = group >> 8;
        assert(group_hi < 256, 'Group too high');
        return [op, smp_flags, data_size_hi, data_size_lo, group_hi, group_lo, this.#smp_sequence_number, group_cmd_id];
    }
}

export { MCUManager };