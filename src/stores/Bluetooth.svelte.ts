// bluetoothManager.svelte.js
import { BluetoothManager } from '../js/bluetoothManager';

export const bluetoothManager = new BluetoothManager(
  '8d53dc1d-1db7-4cd3-868b-8a527460aa84', // MIDI service UUID
  'da2e7828-fbce-4e01-ae9e-261174997c48'  // MIDI characteristic UUID
);

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