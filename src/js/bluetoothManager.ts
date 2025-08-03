import { Log } from './utilities';

let log = new Log('bluetooth', Log.LEVEL_INFO);

type ConnectionState =
  | { type: 'disconnected' }
  | { type: 'selectingDevice' }
  | { type: 'connecting' }
  | { type: 'connected' }
  | { type: 'disconnecting' }
  | { type: 'connectionLoss' };

/**
 * BluetoothManager - Handles multiple Bluetooth services equally
 * 
 * This manager treats all services at the same level. No service is "primary".
 * All services (SMP, MIDI, etc.) are treated equally and can be accessed.
 * 
 * Architecture:
 * - Connects to device using any available service
 * - Automatically discovers and makes available all services
 * - Each service can have its own manager (SMP, MIDI, etc.)
 * - All services work simultaneously without hierarchy
 */
export class BluetoothManager {
    private device: BluetoothDevice | null = null;
    private mtu: number = 250; // Adjust if necessary

    // Connection state management
    private state: ConnectionState = { type: 'disconnected' };
    // Event callbacks
    private _onConnect = new Set<() => void>();
    private _onDisconnect = new Set<() => void>();
    private _onConnecting = new Set<() => void>();
    private _onConnectionLoss = new Set<() => void>();
    private _onConnectionReestablished = new Set<() => void>();
    private _onDataReceived = new Set<(data: Uint8Array) => void>();
    private _onDeviceSelection = new Set<() => void>();
    private _onDeviceSelectionCancel = new Set<() => void>();

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

    public onDeviceSelection(callback: () => void) {
        this._onDeviceSelection.add(callback);
    }

    public onDeviceSelectionCancel(callback: () => void) {
        this._onDeviceSelectionCancel.add(callback);
    }

    constructor() {}

    // Get the connected device for other services to use
    public get connectedDevice(): BluetoothDevice | null {
        return this.device;
    }

    // Get the GATT server for other services to use
    public get gattServer(): BluetoothRemoteGATTServer | null {
        return this.device?.gatt || null;
    }

    // Method to get characteristics from any service - all services are equal
    public async getCharacteristic(serviceUUID: string, characteristicUUID: string): Promise<BluetoothRemoteGATTCharacteristic | null> {
        if (!this.device || !this.device.gatt) {
            console.error('No device connected');
            return null;
        }

        try {
            const service = await this.device.gatt.getPrimaryService(serviceUUID);
            const characteristic = await service.getCharacteristic(characteristicUUID);
            return characteristic;
        } catch (error) {
            console.error(`Failed to get characteristic ${characteristicUUID} from service ${serviceUUID}:`, error);
            return null;
        }
    }

    private async _requestDevice(filters?: BluetoothLEScanFilter[]): Promise<BluetoothDevice> {
        const params = {
            optionalServices: [
                '03b80e5a-ede8-4b33-a751-6ce34ec4c700', // MIDI service
                '8d53dc1d-1db7-4cd3-868b-8a527460aa84'  // SMP service
            ]
        } as RequestDeviceOptions;

        if (filters) {
            (params as { filters: BluetoothLEScanFilter[] }).filters = filters;
        } else {
            (params as { acceptAllDevices: boolean }).acceptAllDevices = true;
        }

        // Invoke the device selection start callback
        this._onDeviceSelection.forEach(callback => callback());

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
                this._onDeviceSelectionCancel.forEach(callback => callback());
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
            console.debug('Server connected. All services are available.');

            // No primary service concept - all services are equal
            // Services will be accessed as needed by their respective managers

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
    }

    public get name(): string | undefined {
        return this.device?.name;
    }

    public get maxPayloadSize(): number {
        const MTU_OVERHEAD = 3; // ATT MTU overhead
        return this.mtu - MTU_OVERHEAD - 8; // Default header size of 8
    }
}