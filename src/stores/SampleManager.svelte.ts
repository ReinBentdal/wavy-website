import { generateDummySamples } from '~/js/parsers/samples_parser';
import { bluetoothManager } from './Bluetooth.svelte';
import { mcumgr } from './mcumgr.svelte';
import { SampleManager } from '~/js/mcumgr/SampleManager';

export const sampleManager = new SampleManager(mcumgr);

// if null, it means the device does not support samples, or perhaps failed to communicate for some reason
export const sampleState = $state({
    storageUsed: null,
    isset: null,
    IDs: null,
    IDMap: null,
	uploadPercentage: null,
})

bluetoothManager.onConnect(() => {
    checkDeviceSamples()
    getAvailableSamples();
});

bluetoothManager.onConnectionReestablished(() => {
    checkDeviceSamples()
});

export async function deviceSamplesUpload() {
	sampleState.uploadPercentage = 0;
    await sampleManager.uploadSamples(generateDummySamples(), (percent) => sampleState.uploadPercentage = percent);
	sampleState.uploadPercentage = null;
}

async function checkDeviceSamples() {
	console.log("checking sample manager state")
	try {
		console.log("checking if samples is set on device")
		sampleState.isset = await sampleManager.isSet();
		console.log(`is set: ${sampleState.isset}`)
		if (!sampleState.isset) {
			console.log("no samples are set, setting default")
			await deviceSamplesUpload();
		}
		const ids = await sampleManager.getIDs();
		sampleState.IDs = ids
		sampleState.storageUsed = await sampleManager.getSpaceUsed();

		console.log(`space used: ${sampleState.storageUsed}`)

	} catch (e) {
        console.log(e)
	}
}

async function getAvailableSamples() {
    const device_name = "MONKEY"; // TODO: use DIS instead to get the ID of the device
    const response = await fetch(`/samples/${device_name}/DRM/samples.json`);
    const data = await response.json();
    sampleState.IDMap = data;
	console.log(`available samples:`)
	console.log(data)
}