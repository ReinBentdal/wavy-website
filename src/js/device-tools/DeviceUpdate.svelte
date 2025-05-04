<script>
    import { imageState } from "~/stores/ImageManager.svelte";
    import { imageRhsIsNewer } from '~/js/mcumgr/ImageManager';
    import { imageManager } from '~/stores/ImageManager.svelte'
    import Changelog from "../components/Changelog.svelte";
    import ToggleSwitch from "../components/ToggleSwitch.svelte";
    import FirmwareUpdate from "../components/FirmwareUpdate.svelte";
    import { bluetoothManager } from '~/stores/Bluetooth.svelte';

    let beta = $state(false);
    let updateStage = $state('idle');
    let uploadProgress = $state(0);

    const betaChanged = (value) => beta = value;

    const newestAvailableFirmware = $derived(beta ? imageState.changelog?.dev.versionString : imageState.changelog?.release.versionString)

    let updateState = $derived.by(() => {
        if (imageState.firmwareVersion == null || imageState.changelog == null)
            return null;

        const fw = imageState.firmwareVersion;
        const availableNewest = beta ? imageState.changelog.dev : imageState.changelog.release;

        if (availableNewest.versionString == fw.versionString) {
            return 'up-to-date';
        } else if (imageRhsIsNewer(fw, availableNewest)) {
            return 'upgrade';
        } else {
            return 'downgrade';
        }
    });

    async function startUpdate() {
        try {
            updateStage = 'fetching';
            const firmwareVersion = beta ? imageState.changelog.dev.versionString : imageState.changelog.release.versionString;
            
            updateStage = 'uploading';
            const image = await fetch(`/firmware/MONKEY/app_update_${firmwareVersion}.bin`)
                .then(res => res.arrayBuffer());

            const success = await imageManager.uploadImage(image, (percent) => {
                uploadProgress = percent;
            });
            if (!success) {
                throw "failed to upload image"
            }
            
            updateStage = 'applying';
            await new Promise((resolve) => {
                bluetoothManager.onConnectionReestablished(() => {
                    resolve(null);
                });
            });
            
            updateStage = 'verifying';
            const newFirmware = await imageManager.getFirmwareVersion();
            if (newFirmware.versionString !== firmwareVersion) {
                throw new Error(`Update failed: Device firmware version is ${newFirmware.versionString} but expected ${firmwareVersion}`);
            }
            
            updateStage = 'done';
            await new Promise(resolve => setTimeout(resolve, 2000));
            updateStage = 'idle';
            uploadProgress = 0;
        } catch (e) {
            console.log(e)
            updateStage = 'failed'
            await new Promise(resolve => setTimeout(resolve, 2000));
            updateStage = 'idle';
        }
    }
</script>

<div class="content">
    <div class="top-bar">
        <span>Beta</span><ToggleSwitch init={false} onChange={betaChanged} />
    </div>
    <div class="main-content">
        <div class="console">
            {#if updateStage !== 'idle' && updateStage !== 'failed'}
                <FirmwareUpdate stage={updateStage} uploadProgress={uploadProgress} />
            {:else if updateStage === 'failed'}
                <h1>Failed to upload firmware</h1>
                <span>Please refresh the page and reboot the device and try again.</span>
            {:else if updateState === 'up-to-date'}
                <h1>Your device is up to date!</h1>
                <span class="tagline">Your device is running the newest firmware. To get notifications when new firmware versions are available, add your email at the bottom of this page.</span>
            {:else if updateState === 'upgrade'}
                <h1>New update available</h1>
                <span class="tagline">Your device is ready to be updated</span>
                <span>v{imageState.firmwareVersion.versionString} ➔ v{newestAvailableFirmware}</span>
                <button class="update-buttons" style="background-color: #B7FF9E;" onclick={startUpdate}>Start update</button>
            {:else if updateState === 'downgrade'}
                <h1>Downgrade available</h1>
                <span class="tagline">Your device running a beta firmware. Downgrade to stable release</span>
                <span>v{imageState.firmwareVersion.versionString} ➔ v{newestAvailableFirmware}</span>
                <button class="update-buttons" style="background-color: #fffb9e;" onclick={startUpdate}>Start downgrade</button>
            {:else}
                <h1>Waiting on device..</h1>
            {/if}
        </div>
        <hr />
        <Changelog beta={beta} />
    </div>
</div>

<style>
    .content {
        padding: 20px;
    }
    .top-bar {
        display: flex;
        flex-direction: row;
        justify-content: end;
        align-items: center;
        gap: 5px;
    }

    .main-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .console {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
</style>