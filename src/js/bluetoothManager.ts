import { Log } from './utilities';

let log = new Log('bluetooth', Log.LEVEL_INFO);

type ConnectionState =
  | { type: 'disconnected' }
  | { type: 'selectingDevice' }
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnecting' }
  | { type: 'connectionLoss' };

export class BluetoothManager {
    private device: BluetoothDevice | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private mtu: number = 250; // Adjust if necessary
    private buffer: Uint8Array = new Uint8Array([]);

    // Connection state management
    private state: ConnectionState = { type: 'disconnected' };
    // Event callbacks
    private _onConnect = new Set<() => void>();
    private _onDisconnect = new Set<() => void>();
    private _onConnecting = new Set<() => void>();
    private _onConnectionLoss = new Set<() => void>();
    private _onConnectionReestablished = new Set<() => void>();
    private _onDataReceived = new Set<(data: Uint8Array) => void>();

    // Event trigger methods
    public onConnect(callback: () => void) {
        this._onConnect.add(callback);
    }

    public onDisconnect(callback: () => void) {
        this._onDisconnect.add(callback);
    }

    public onConnecting(callback: () => void) {
        this._onConnecting.add(callback);
    }

    public onConnectionLoss(callback: () => void) {
        this._onConnectionLoss.add(callback);
    }

    public onConnectionReestablished(callback: () => void) {
        this._onConnectionReestablished.add(callback);
    }

    public onDataReceived(callback: (data: Uint8Array) => void) {
        this._onDataReceived.add(callback);
    }

    constructor(
        private readonly serviceUUID: string,
        private readonly characteristicUUID: string,
        private readonly headerSize: number = 8
    ) {}

    private async _requestDevice(filters?: BluetoothLEScanFilter[]): Promise<BluetoothDevice> {
        const params = {
            optionalServices: [this.serviceUUID]
        } as RequestDeviceOptions;

        if (filters) {
            (params as { filters: BluetoothLEScanFilter[] }).filters = filters;
        } else {
            (params as { acceptAllDevices: boolean }).acceptAllDevices = true;
        }

        // Invoke the device selection start callback
        // this.onDeviceSelection?.();

        return navigator.bluetooth.requestDevice(params);
    }

    public async connect(filters?: BluetoothLEScanFilter[]): Promise<void> {
        if (this.state.type !== 'disconnected') {
            console.warn('Already connecting or connected.');
            return;
        }

        this.state = { type: 'selectingDevice' };

        try {
            this.device = await this._requestDevice(filters);
            // Device selected, move to connecting
            this.state = { type: 'connecting' };
            this._onConnecting.forEach(callback => callback());

            console.debug(`Connecting to device ${this.device.name}...`);

            this.device.addEventListener('gattserverdisconnected', this._handleDisconnection.bind(this));

            await this._connectDevice();
        } catch (error) {
            if (error.name === 'NotFoundError') {
                // User canceled the device selection
                console.debug('Device selection canceled.');
                this.state = { type: 'disconnected' };
                // this.onDeviceSelectionCancel?.();
            } else {
                console.error('Connection error:', error);
                await this._handleDisconnected();
            }
        }
    }

    private async _connectDevice(): Promise<void> {
        if (!this.device) {
            console.error('No device to connect to');
            return;
        }

        try {
            const server = await this.device.gatt!.connect();
            console.debug('Server connected. Awaiting service...');

            this.service = await server.getPrimaryService(this.serviceUUID);
            console.debug('Service connected.');

            this.characteristic = await this.service.getCharacteristic(this.characteristicUUID);
            this.characteristic.addEventListener('characteristicvaluechanged', this._notification.bind(this));
            await this.characteristic.startNotifications();

            if (this.state.type === 'connecting' || this.state.type === 'connectionLoss') {
                if (this.state.type === 'connectionLoss') {
                    this._onConnectionReestablished.forEach(callback => callback());
                } else {
                    this._onConnect.forEach(callback => callback());
                }
                this.state = { type: 'connected' };
            }
        } catch (error) {
            console.error('Error during connection:', error);
            await this._handleDisconnected();
        }
    }

    public disconnect(): void {
        if (this.state.type !== 'connected') {
            console.warn('Cannot disconnect because not connected.');
            return;
        }

        this.state = { type: 'disconnecting' };

        if (this.device && this.device.gatt) {
            this.device.gatt.disconnect();
        }
    }

    private async _handleDisconnection(): Promise<void> {
        console.debug('Device disconnected');

        if (this.state.type === 'connected') {
            // Connection was lost unexpectedly
            this.state = { type: 'connectionLoss' };
            this._onConnectionLoss.forEach(callback => callback());

            // Attempt to reconnect
            await this._reconnect();
        } else if (this.state.type === 'disconnecting') {
            // User requested disconnect
            await this._handleDisconnected();
        }
    }

    private async _reconnect(): Promise<void> {
        try {
            // Wait a moment before attempting to reconnect
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this._connectDevice();
        } catch (error) {
            console.error('Reconnection error:', error);
            // Optionally retry or notify the user
        }
    }

    private async _handleDisconnected(): Promise<void> {
        this.state = { type: 'disconnected' };
        this._onDisconnect.forEach(callback => callback());

        // Clean up resources
        this.device = null;
        this.service = null;
        this.characteristic = null;
    }

    public get name(): string | undefined {
        return this.device?.name;
    }

    public get maxPayloadSize(): number {
        const MTU_OVERHEAD = 3; // ATT MTU overhead
        return this.mtu - MTU_OVERHEAD - this.headerSize;
    }

    public async sendMessage(message: Uint8Array): Promise<void> {
        if (!this.characteristic) {
            log.debug('Characteristic not available');
            throw new Error('Characteristic not available');
        }
        await this.characteristic.writeValueWithoutResponse(message);
    }

    // Data received from the device
    private async _notification(event: Event): Promise<void> {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        log.debug('Notification received');
        log.debug(characteristic.value);
        const value = new Uint8Array(characteristic.value!.buffer);
        this.buffer = new Uint8Array([...this.buffer, ...value]);

        // Process all complete messages in the buffer
        while (this.buffer.length >= this.headerSize) {
            const length = (this.buffer[2] << 8) | this.buffer[3];
            const totalLength = this.headerSize + length;
            if (this.buffer.length >= totalLength) {
                const message = this.buffer.slice(0, totalLength);
                log.debug('Processing message');
                log.debug(message);
                this._onDataReceived.forEach(callback => callback(message));
                this.buffer = this.buffer.slice(totalLength);
            } else {
                break;
            }
        }
    }
}