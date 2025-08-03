import { MIDIManager } from '~/js/midiManager';
import { bluetoothManager } from './Bluetooth.svelte';

export const midiManager = new MIDIManager(bluetoothManager); 