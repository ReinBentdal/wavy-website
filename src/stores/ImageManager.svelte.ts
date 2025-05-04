import { mcumgr } from './mcumgr.svelte';
import { ImageFirmwareVersion, ImageManager } from '~/js/mcumgr/ImageManager';
import { bluetoothManager, bluetoothState } from './Bluetooth.svelte';
import { parseChangelog } from '~/js/parsers/changelog_parser';
export const imageManager = new ImageManager(mcumgr);

export const imageState = $state({
    firmwareVersion: null,
    changelog: null,
})

bluetoothManager.onConnect(() => {
    updateFirmwareVersion()
    updateChangelog()
});
bluetoothManager.onConnectionReestablished(() => {
    updateFirmwareVersion()
    updateChangelog()
});

bluetoothManager.onDisconnect(() => {
    imageState.firmwareVersion = null;
});
bluetoothManager.onConnectionLoss(() => {
    imageState.firmwareVersion = null;
});

const updateChangelog = async () => {
    const device_name = "MONKEY"; // TODO: use DIS instead to get the ID of the device
    const response = await fetch(`/firmware/${device_name}/changelog.md`);
    const data = await response.text();
    const changelog = parseChangelog(data);
    console.log(changelog)
    imageState.changelog = changelog;
}

const updateFirmwareVersion = async () => {
    const fw = await imageManager.getFirmwareVersion();
    console.log('Firmware version:', fw.versionString);
    imageState.firmwareVersion = fw;
}
