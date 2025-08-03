// bluetoothManager.svelte.js
import { BluetoothManager } from '../js/bluetoothManager';

// Create BluetoothManager - no primary service concept
// All services (SMP, MIDI) are treated equally
export const bluetoothManager = new BluetoothManager();

// Reactive state object
export const bluetoothState = $state({
  connectionState: 'disconnected',
  deviceName: 'unknown device name'
});

// Setup event handlers to update reactive state properties
bluetoothManager.onConnect(() => {
  bluetoothState.connectionState = 'connected';
  bluetoothState.deviceName = bluetoothManager.name || 'unknown device name';
});
bluetoothManager.onConnecting(() => {
  bluetoothState.connectionState = 'connecting';
});
bluetoothManager.onDisconnect(() => {
  // bluetoothState.connectionState = 'disconnected';
  window.location.reload();
});
bluetoothManager.onConnectionLoss(() => {
  bluetoothState.connectionState = 'connectionLoss';
});
bluetoothManager.onConnectionReestablished(() => {
  bluetoothState.connectionState = 'connected';
});