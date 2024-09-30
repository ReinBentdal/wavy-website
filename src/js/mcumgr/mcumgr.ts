// MCUManager.ts

import { assert, Log } from '../utilities';
import CBOR from './cbor'; // Assuming CBOR is imported from './cbor'

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
    private device: BluetoothDevice | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private mtu: number = 140; // Adjust if necessary
    private buffer: Uint8Array = new Uint8Array([]);
    private smpSequenceNumber: number = 0;
    private responseResolvers: { [sequenceNumber: number]: ResponseResolver } = {};
    private userRequestedDisconnect: boolean = false;
    private connectCallback: (() => void) | null = null;
    private disconnectCallback: (() => void) | null = null;
    private connectingCallback: (() => void) | null = null;
    private connectionLossCallback: (() => void) | null = null;

    private readonly SMP_SERVICE_UUID: string = '8d53dc1d-1db7-4cd3-868b-8a527460aa84';
    private readonly SMP_CHARACTERISTIC_UUID: string = 'da2e7828-fbce-4e01-ae9e-261174997c48';
    private readonly SMP_HEADER_SIZE: number = 8;
    private readonly SMP_HEADER_OP_IDX: number = 0;
    private readonly SMP_HEADER_FLAGS_IDX: number = 1;
    private readonly SMP_HEADER_LEN_HI_IDX: number = 2;
    private readonly SMP_HEADER_LEN_LO_IDX: number = 3;
    private readonly SMP_HEADER_GROUP_HI_IDX: number = 4;
    private readonly SMP_HEADER_GROUP_LO_IDX: number = 5;
    private readonly SMP_HEADER_SEQ_IDX: number = 6;
    private readonly SMP_HEADER_ID_IDX: number = 7;

    constructor() {
        // Initialization is handled above
    }

    private async requestDevice(filters?: BluetoothLEScanFilter[]): Promise<BluetoothDevice> {
        const params = {
            optionalServices: [this.SMP_SERVICE_UUID]
        } as RequestDeviceOptions;
        
        if (filters) {
            (params as { filters: BluetoothLEScanFilter[] }).filters = filters;
        } else {
            (params as { acceptAllDevices: boolean }).acceptAllDevices = false;
        }
        return navigator.bluetooth.requestDevice(params);
    }

    public async connect(filters?: BluetoothLEScanFilter[]): Promise<void> {
        try {
            this.device = await this.requestDevice(filters);
            log.debug(`Connecting to device ${this.name}...`);
            this.device.addEventListener('gattserverdisconnected', async () => {
                log.debug('Device disconnected');
                if (!this.userRequestedDisconnect) {
                    log.debug('Trying to reconnect');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (this.connectionLossCallback) this.connectionLossCallback();
                    await this.connectDevice();
                } else {
                    await this.disconnected();
                }
            });
            await this.connectDevice();
        } catch (error) {
            log.error('Connection error:', error);
            await this.disconnected();
        }
    }

    private async connectDevice(): Promise<void> {
        if (!this.device) {
            log.error('No device to connect to');
            return;
        }
        try {
            if (this.connectingCallback) this.connectingCallback();
            const server = await this.device.gatt!.connect();
            log.debug('Server connected. Awaiting SMP service...');
            this.service = await server.getPrimaryService(this.SMP_SERVICE_UUID);
            log.debug('Service connected.');
            this.characteristic = await this.service.getCharacteristic(this.SMP_CHARACTERISTIC_UUID);
            this.characteristic.addEventListener('characteristicvaluechanged', this.notification.bind(this));
            await this.characteristic.startNotifications();
            await this.connected();
        } catch (error) {
            log.error('Error during connection:', error);
            await this.disconnected();
        }
    }

    public disconnect(): void {
        this.userRequestedDisconnect = true;
        if (this.device && this.device.gatt) {
            this.device.gatt.disconnect();
        }
    }

    public onConnecting(callback: () => void): this {
        this.connectingCallback = callback;
        return this;
    }

    public onConnect(callback: () => void): this {
        this.connectCallback = callback;
        return this;
    }

    public onDisconnect(callback: () => void): this {
        this.disconnectCallback = callback;
        return this;
    }

    public onConnectionLoss(callback: () => void): this {
        this.connectionLossCallback = callback;
        return this;
    }

    private async connected(): Promise<void> {
        if (this.connectCallback) this.connectCallback();
    }

    private async disconnected(): Promise<void> {
        log.debug('Disconnected.');
        if (this.disconnectCallback) this.disconnectCallback();
        this.device = null;
        this.service = null;
        this.characteristic = null;
        this.userRequestedDisconnect = false;
    }

    public get name(): string | undefined {
        return this.device?.name;
    }

    public get maxPayloadSize(): number {
        const MTU_OVERHEAD = 3; // ATT MTU overhead
        return this.mtu - MTU_OVERHEAD - this.SMP_HEADER_SIZE;
    }

    private buildSMPMessage(op: number, flags: number, group: number, sequenceNumber: number, commandId: number, payload: Uint8Array = new Uint8Array([])): Uint8Array {
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
        const message = this.buildSMPMessage(op, flags, group, sequenceNumber, id, payload);

        return new Promise<any>(async (resolve, reject) => {
            // Store the resolver function to be called when the response arrives
            this.responseResolvers[sequenceNumber] = { resolve, reject };

            try {
                if (!this.characteristic) {
                    log.debug('Characteristic not available');
                    throw new Error('Characteristic not available');
                }
                await this.characteristic.writeValueWithoutResponse(message);
            } catch (error) {
                log.dbg(`Failed to send bluetooth characteristic message: ${error}`);
                delete this.responseResolvers[sequenceNumber];
                reject(error);
            }

            // The promise will be resolved when the response arrives in the notification handler
        });
    }

    // Data received from the device
    private async notification(event: Event): Promise<void> {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        log.debug('Notification received');
        log.debug(characteristic.value);
        const value = new Uint8Array(characteristic.value!.buffer);
        this.buffer = new Uint8Array([...this.buffer, ...value]);

        // Process all complete messages in the buffer
        while (this.buffer.length >= this.SMP_HEADER_SIZE) {
            const length = (this.buffer[2] << 8) | this.buffer[3];
            const totalLength = this.SMP_HEADER_SIZE + length;
            if (this.buffer.length >= totalLength) {
                const message = this.buffer.slice(0, totalLength);
                log.debug('Processing message');
                log.debug(message);
                await this.processMessage(message);
                this.buffer = this.buffer.slice(totalLength);
            } else {
                break;
            }
        }
    }

    private async processMessage(message: Uint8Array): Promise<void> {
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
            log.warn(`No resolver found for sequence number ${seq}`);
        }

    }
}
