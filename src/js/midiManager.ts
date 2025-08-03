import { BluetoothManager } from './bluetoothManager';

/**
 * MIDIManager - High-level MIDI protocol manager
 * 
 * Follows the same pattern as other managers:
 * - Handles MIDI protocol specifics
 * - Provides high-level API
 * - Manages MIDI characteristic lifecycle
 * - Handles MIDI message parsing and formatting
 */
export class MIDIManager {
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private _onMIDIMessage = new Set<(data: Uint8Array) => void>();
    private _onNoteOn = new Set<(note: number, velocity: number, channel: number) => void>();
    private _onNoteOff = new Set<(note: number, velocity: number, channel: number) => void>();
    private _onControlChange = new Set<(controller: number, value: number, channel: number) => void>();
    private midiWritePromise: Promise<void> | null = null;
    private midiInitPromise: Promise<void> | null = null;

    // Standard MIDI service and characteristic UUIDs
    private readonly MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
    private readonly MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

    constructor(private bluetoothManager: BluetoothManager) {
        // Re-initialize when connection is re-established
        this.bluetoothManager.onConnectionReestablished(() => {
            console.log('Reconnection detected, re-initializing MIDI...');
            this.characteristic = null;
            this.midiInitPromise = null;
            this.initialize(); // Re-initialize immediately
        });
    }

    // High-level event handlers
    public onMIDIMessage(callback: (data: Uint8Array) => void) {
        this._onMIDIMessage.add(callback);
    }

    public onNoteOn(callback: (note: number, velocity: number, channel: number) => void) {
        this._onNoteOn.add(callback);
    }

    public onNoteOff(callback: (note: number, velocity: number, channel: number) => void) {
        this._onNoteOff.add(callback);
    }

    public onControlChange(callback: (controller: number, value: number, channel: number) => void) {
        this._onControlChange.add(callback);
    }

    // Initialize MIDI characteristic and start listening
    public async initialize(): Promise<boolean> {
        if (this.midiInitPromise) {
            console.log('MIDI initialization already in progress, waiting...');
            await this.midiInitPromise;
            return this.characteristic !== null;
        }

        console.log('Starting MIDI initialization...');
        this.midiInitPromise = new Promise<void>(async (resolve, reject) => {
            try {
                console.log('Initializing MIDI characteristic...');
                
                this.characteristic = await this.bluetoothManager.getCharacteristic(
                    this.MIDI_SERVICE_UUID, 
                    this.MIDI_CHARACTERISTIC_UUID
                );

                if (!this.characteristic) {
                    console.error('Failed to get MIDI characteristic');
                    reject(new Error('Failed to get MIDI characteristic'));
                    return;
                }

                // Start notifications
                console.log('Starting MIDI notifications...');
                await this.characteristic.startNotifications();
                
                // Add event listener
                this.characteristic.addEventListener('characteristicvaluechanged', this._handleMIDIMessage.bind(this));
                
                console.log('MIDI manager initialized successfully');
                resolve();
            } catch (error) {
                console.error('Failed to initialize MIDI manager:', error);
                reject(error);
            } finally {
                console.log('MIDI initialization promise completed, clearing reference');
                this.midiInitPromise = null;
            }
        });

        try {
            await this.midiInitPromise;
            return true;
        } catch (error) {
            return false;
        }
    }

    // Send MIDI message
    public async sendMIDIMessage(message: Uint8Array): Promise<void> {
        // Wait for initialization to complete
        if (!this.characteristic) {
            console.log('MIDI characteristic not available, waiting for initialization...');
            const success = await this.initialize();
            if (!success) {
                throw new Error('Failed to initialize MIDI characteristic');
            }
        }

        if (!this.characteristic) {
            throw new Error('MIDI characteristic not available');
        }

        // Wait for any ongoing write operation to complete
        if (this.midiWritePromise) {
            console.log('Waiting for previous MIDI write operation to complete...');
            await this.midiWritePromise;
        }

        // Create a new write promise
        this.midiWritePromise = this.characteristic.writeValueWithoutResponse(message);
        await this.midiWritePromise;
        this.midiWritePromise = null; // Clear after completion
    }

    // High-level MIDI send methods
    public async sendNoteOn(note: number, velocity: number, channel: number = 0): Promise<void> {
        const message = this._buildNoteOnMessage(note, velocity, channel);
        await this.sendMIDIMessage(message);
    }

    public async sendNoteOff(note: number, velocity: number, channel: number = 0): Promise<void> {
        const message = this._buildNoteOffMessage(note, velocity, channel);
        await this.sendMIDIMessage(message);
    }

    public async sendControlChange(controller: number, value: number, channel: number = 0): Promise<void> {
        const message = this._buildControlChangeMessage(controller, value, channel);
        await this.sendMIDIMessage(message);
    }

    // Check if MIDI is initialized
    public isInitialized(): boolean {
        return this.characteristic !== null;
    }

    // Private methods for MIDI message handling
    private _handleMIDIMessage(event: Event): void {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const value = new Uint8Array(characteristic.value!.buffer);
        
        console.log('MIDI message received:', value);
        this._onMIDIMessage.forEach(callback => callback(value));
        
        // Parse and emit high-level events
        this._parseMIDIMessage(value);
    }

    private _parseMIDIMessage(data: Uint8Array): void {
        if (data.length < 5) {
            console.warn("Received MIDI message too short:", data);
            return;
        }

        // Bytes 0 and 1 are timestamp (ignored)
        // Byte 2 is the status byte
        const status = data[2];
        const type = status & 0xF0;
        const channel = status & 0x0F;
        
        // Byte 3 is the note/controller value
        const noteOrController = data[3];
        // Byte 4 is the velocity/controller value
        const value = data[4];

        console.log('MIDI parsed - status:', status, 'type:', type, 'note/controller:', noteOrController, 'value:', value, 'channel:', channel);

        switch (type) {
            case 0x90: // Note On
                if (value === 0) {
                    // Note On with zero velocity is treated as Note Off
                    this._onNoteOff.forEach(callback => callback(noteOrController, value, channel));
                } else {
                    this._onNoteOn.forEach(callback => callback(noteOrController, value, channel));
                }
                break;
            case 0x80: // Note Off
                this._onNoteOff.forEach(callback => callback(noteOrController, value, channel));
                break;
            case 0xB0: // Control Change
                this._onControlChange.forEach(callback => callback(noteOrController, value, channel));
                break;
        }
    }

    // Private methods for building MIDI messages
    private _buildNoteOnMessage(note: number, velocity: number, channel: number): Uint8Array {
        const timestamp = new Uint8Array([0, 0]); // 16-bit timestamp
        const status = 0x90 | (channel & 0x0F);
        return new Uint8Array([...timestamp, status, note, velocity]);
    }

    private _buildNoteOffMessage(note: number, velocity: number, channel: number): Uint8Array {
        const timestamp = new Uint8Array([0, 0]); // 16-bit timestamp
        const status = 0x80 | (channel & 0x0F);
        return new Uint8Array([...timestamp, status, note, velocity]);
    }

    private _buildControlChangeMessage(controller: number, value: number, channel: number): Uint8Array {
        const timestamp = new Uint8Array([0, 0]); // 16-bit timestamp
        const status = 0xB0 | (channel & 0x0F);
        return new Uint8Array([...timestamp, status, controller, value]);
    }
} 