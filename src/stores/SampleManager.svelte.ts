import { generateSamplePack } from '~/js/data/samplePack';
import { bluetoothManager } from './Bluetooth.svelte';
import { mcumgr } from './mcumgr.svelte';
import { SampleManager } from '~/js/mcumgr/SampleManager';

export const sampleManager = new SampleManager(mcumgr);

// if null, it means the device does not support samples, or perhaps failed to communicate for some reason
export const sampleState = $state({
	isSupported: false,
    isset: null,
	storageTotal: null,
    storageUsed: null,
    IDs: null,
    names: null,
	uploadPercentage: null,
})

bluetoothManager.onConnect(() => {
	sampleState.isSupported = false;
	(async () => {
		const hasSamples = await checkDeviceHasSamples()
		hasSamples && await checkDeviceSamples()
	})();
    getAvailableSamples();
});

bluetoothManager.onConnectionReestablished(() => {
	sampleState.isSupported = false;
	(async () => {
		const hasSamples = await checkDeviceHasSamples()
		hasSamples && await checkDeviceSamples()
	})();
});

export async function deviceSampleUploadDefault() {
	const defaultPages = [2, 3, 1, 57005]
	await deviceSamplesUpload(defaultPages);
}

export async function deviceSamplesUpload(selectedIDs: number[]) {
	const samplePack = await generateSamplePack(selectedIDs)

	sampleState.uploadPercentage = 0;
    await sampleManager.uploadSamples(samplePack, (percent) => sampleState.uploadPercentage = percent);
	sampleState.uploadPercentage = null;

	await checkDeviceSamples()
}

async function checkDeviceSamples() {
	try {
		const ids = await sampleManager.getIDs();
		sampleState.IDs = ids
		const storage = await sampleManager.getSpaceUsed();

		sampleState.storageUsed = storage.usd
		sampleState.storageTotal = storage.tot
	} catch (e) {
		console.log(e)
	}
}

async function checkDeviceHasSamples() {
	console.log("checking sample manager state")
	try {
		sampleState.isset = await sampleManager.isSet();
		sampleState.isSupported = true;
		if (!sampleState.isset) {
			console.log("no samples are set, setting default")
			await deviceSampleUploadDefault()
			sampleState.isset = true;
		}
		return true;
	} catch (e) {
        console.log(e)
	}
	return false;
}

async function getAvailableSamples() {
    const device_name = "MONKEY"; // TODO: use DIS instead to get the ID of the device
    const response = await fetch(`/samples/${device_name}/DRM/samples.json`);
    const data = await response.json();
    sampleState.names = data;
}