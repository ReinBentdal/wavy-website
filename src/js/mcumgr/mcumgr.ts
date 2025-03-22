// MCUManager.ts

import { assert, Log } from '../utilities';
import CBOR from './cbor';
import { BluetoothManager } from '../bluetoothManager';

let log = new Log('mcumgr', Log.LEVEL_DEBUG);

export const SMP_ERR_RC: { [code: number]: string } = {
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

export const MGMT_ERR = {
    EOK: 0,                         // No error (success)
    EUNKNOWN: 1,                    // Unknown error
    ENOMEM: 2,                      // Insufficient memory
    EINVAL: 3,                      // Error in input value
    ETIMEOUT: 4,                    // Operation timed out
    ENOENT: 5,                      // No such file/entry
    EBADSTATE: 6,                   // Current state disallows command
    EMSGSIZE: 7,                    // Response too large
    ENOTSUP: 8,                     // Command not supported
    ECORRUPT: 9,                    // Corrupt
    EBUSY: 10,                      // Command blocked by another command
    EACCESSDENIED: 11,              // Access denied
    UNSUPPORTED_TOO_OLD: 12,        // Protocol version too old
    UNSUPPORTED_TOO_NEW: 13,        // Protocol version too new
    EPERUSER: 256                   // User errors from 256 onwards
};

// Define operation codes
export const MGMT_OP = {
    READ: 0,
    READ_RSP: 1,
    WRITE: 2,
    WRITE_RSP: 3,
};

export interface ResponseError {
    rc: number; // Error code, only appears if non-zero (error condition)
}

interface ResponseResolver {
    resolve: (data: any) => void;
    reject: (error: any) => void;
}

export class MCUManager {
    private smpSequenceNumber: number = 0;
    private responseResolvers: { [sequenceNumber: number]: ResponseResolver } = {};
    private readonly SMP_HEADER_SIZE: number = 8;
    private readonly SMP_HEADER_OP_IDX: number = 0;
    private readonly SMP_HEADER_FLAGS_IDX: number = 1;
    private readonly SMP_HEADER_LEN_HI_IDX: number = 2;
    private readonly SMP_HEADER_LEN_LO_IDX: number = 3;
    private readonly SMP_HEADER_GROUP_HI_IDX: number = 4;
    private readonly SMP_HEADER_GROUP_LO_IDX: number = 5;
    private readonly SMP_HEADER_SEQ_IDX: number = 6;
    private readonly SMP_HEADER_ID_IDX: number = 7;

    constructor(private bluetoothManager: BluetoothManager) {
        this.bluetoothManager.onDataReceived(this._processMessage.bind(this));
    }

    public get maxPayloadSize(): number {
        return this.bluetoothManager.maxPayloadSize;
    }

    private _buildSMPMessage(op: number, flags: number, group: number, sequenceNumber: number, commandId: number, payload: Uint8Array = new Uint8Array([])): Uint8Array {
        const length = payload.length;
        const header = new Uint8Array(this.SMP_HEADER_SIZE);
        header[this.SMP_HEADER_OP_IDX] = op;
        header[this.SMP_HEADER_FLAGS_IDX] = flags;
        header[this.SMP_HEADER_LEN_HI_IDX] = (length >> 8) & 0xFF;
        header[this.SMP_HEADER_LEN_LO_IDX] = length & 0xFF;
        header[this.SMP_HEADER_GROUP_HI_IDX] = (group >> 8) & 0xFF;
        header[this.SMP_HEADER_GROUP_LO_IDX] = group & 0xFF;
        header[this.SMP_HEADER_SEQ_IDX] = sequenceNumber;
        header[this.SMP_HEADER_ID_IDX] = commandId;
        return new Uint8Array([...header, ...payload]);
    }

    public async sendMessage(op: number, group: number, id: number, payload: Uint8Array = new Uint8Array([])): Promise<Object> {
        const sequenceNumber = this.smpSequenceNumber;
        this.smpSequenceNumber = (this.smpSequenceNumber + 1) % 256;
        const flags = 0;
        const message = this._buildSMPMessage(op, flags, group, sequenceNumber, id, payload);

        return new Promise<any>(async (resolve, reject) => {
            // Store the resolver function to be called when the response arrives
            this.responseResolvers[sequenceNumber] = { resolve, reject };

            try {
                await this.bluetoothManager.sendMessage(message);
            } catch (error) {
                log.debug(`Failed to send bluetooth characteristic message: ${error}`);
                delete this.responseResolvers[sequenceNumber];
                reject(error);
            }

            // The promise will be resolved when the response arrives in the notification handler
        });
    }

    private async _processMessage(message: Uint8Array): Promise<void> {
        const [op, flags, length_hi, length_lo, group_hi, group_lo, seq, id] = message.slice(0, this.SMP_HEADER_SIZE);
        const payload = message.slice(this.SMP_HEADER_SIZE);
        log.debug("payload");
        log.debug(payload);
        
        let data;
        try {
            data = CBOR.decode(payload.buffer);    
        } catch (error) {
            log.error('Error decoding CBOR:', error);
        }
        // Resolve the promise associated with this sequence number
        const resolver = this.responseResolvers[seq];
        if (resolver) {
            resolver.resolve(data);
            delete this.responseResolvers[seq];
        } else {
            log.warning(`No resolver found for sequence number ${seq}`);
        }
    }
}