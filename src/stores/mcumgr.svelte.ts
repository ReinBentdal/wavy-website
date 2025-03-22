
import { MCUManager } from '~/js/mcumgr/mcumgr';
import { bluetoothManager } from './Bluetooth.svelte';

export const mcumgr = new MCUManager(bluetoothManager);