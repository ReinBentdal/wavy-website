<script>
    import { bluetoothManager, bluetoothState } from '~/stores/Bluetooth.svelte';
    import ConnectionStatus from '~/js/components/ConnectionStatus.svelte';
    import DeviceUpdate from './DeviceUpdate.svelte';
    import DeviceSampleManager from './DeviceSampleManager.svelte';
    import { imageState } from '~/stores/ImageManager.svelte';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import ActionStatus from '../components/ActionStatus.svelte';

    const View = {
        DeviceUpdate: 'DeviceUpdate',
        SampleManager: 'SampleManager'
    };

    let currentView = $state(View.DeviceUpdate);

    // Update view based on URL hash
    function updateView() {
        const hash = window.location.hash.slice(1); // Remove the # symbol
        currentView = hash === 'sample-manager' ? View.SampleManager : View.DeviceUpdate;
    }

    onMount(() => {
        window.addEventListener('hashchange', updateView);
        updateView(); // Initial view setup
    });
</script>

<div>
    <nav>
        <div>
            <button onclick={() => bluetoothManager.disconnect()}>
                <i class="bi-bluetooth-disconnect"></i>
                disconnect
            </button>
            <span>{bluetoothState.deviceName}</span>
            <ConnectionStatus />
                <span>v{imageState?.firmwareVersion?.versionString ?? '?.?.?'}</span>
            <ActionStatus />
        </div>
        <div>
            <a href="#device-update" class={currentView === View.DeviceUpdate ? 'active' : ''}>Device Update</a>
            <a href="#sample-manager" class={currentView === View.SampleManager ? 'active' : ''}>Sample Manager</a>
        </div>
    </nav>

    {#if currentView === View.DeviceUpdate}
    <div in:fade={{ duration: 200 }}>
        <DeviceUpdate />
    </div>
    {:else if currentView === View.SampleManager}
        <div in:fade={{ duration: 200 }}>
            <DeviceSampleManager />
        </div>
    {/if}
</div>


<style>
    nav {
        background-color: white;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 20px;
        justify-content: space-between;
        width: 100vw;
        flex-wrap: wrap;
        border-top: 2px solid rgba(0,0,0,0.1);
        border-bottom: 2px solid rgba(0,0,0,0.1);
    }

    nav > div {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 20px;
    }

    nav a:hover {
        text-decoration: none;
    }

    .active {
        border-bottom: 2px solid gray;
    }
</style>