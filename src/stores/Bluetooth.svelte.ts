import { writable } from 'svelte/store';
import { BluetoothManager } from '../js/bluetoothManager';

export const bluetoothManager = new BluetoothManager(
  '8d53dc1d-1db7-4cd3-868b-8a527460aa84', // MIDI service UUID
  'da2e7828-fbce-4e01-ae9e-261174997c48', // MIDI characteristic UUID
);

// Svelte stores
export const connectionState = writable<'disconnected' | 'connecting' | 'connected' | 'connectionLoss'>('disconnected');
export const receivedData = writable<Uint8Array | null>(null);
export const deviceName = writable<string | null>(null);

// Setup event handlers
bluetoothManager.onConnect = () => {
  connectionState.set('connected')
  deviceName.set(bluetoothManager.name)
}
bluetoothManager.onConnecting = () => connectionState.set('connecting');
bluetoothManager.onDisconnect = () => connectionState.set('disconnected');
bluetoothManager.onConnectionLoss = () => connectionState.set('connectionLoss');
bluetoothManager.onConnectionReestablished = () => connectionState.set('connected');