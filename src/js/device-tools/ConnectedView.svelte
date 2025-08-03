<script>
    // Dev Mode Feature:
    // - Type "enable dev mode" in the browser console to show the Device Tester tab
    // - Type "disable dev mode" to hide it
    // - Dev mode state persists in localStorage
    // - The Device Tester allows testing Bluetooth MIDI functionality with the WAVY MONKEY device
    
    import { bluetoothManager, bluetoothState } from '~/stores/Bluetooth.svelte';
    import ConnectionStatus from '~/js/components/ConnectionStatus.svelte';
    import DeviceUpdate from './DeviceUpdate.svelte';
    import DeviceSampleManager from './DeviceSampleManager.svelte';
    import DeviceTester from './DeviceTester.svelte';
    import { imageState } from '~/stores/ImageManager.svelte';
    import { devMode } from '~/stores/DevMode.svelte';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import ActionStatus from '../components/ActionStatus.svelte';
    import { sampleState } from '~/stores/SampleManager.svelte';

    const View = {
        DeviceUpdate: 'DeviceUpdate',
        SampleManager: 'SampleManager',
        DeviceTester: 'DeviceTester'
    };

    let currentView = $state(View.DeviceUpdate);

    // Update view based on URL hash
    function updateView() {
        const hash = window.location.hash.slice(1); // Remove the # symbol
        if (hash === 'sample-manager') {
            currentView = View.SampleManager;
        } else if (hash === 'device-tester' && $devMode) {
            currentView = View.DeviceTester;
        } else {
            currentView = View.DeviceUpdate;
        }
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
            {#if $devMode}
                <span class="dev-indicator" title="Dev mode active - type 'disable dev mode' in console to disable">🔧</span>
            {/if}
        </div>
        <div>
            <a href="#device-update" class={currentView === View.DeviceUpdate ? 'active' : ''}>Device Update</a>
            <a 
                href="#sample-manager" 
                class={currentView === View.SampleManager ? 'active' : ''}
                class:disabled={!sampleState.isSupported}
                onclick={e => sampleState.isSupported == false && e.preventDefault()}
                title={!sampleState.isSupported ? "firmware version 1.2.0 or greater is required" : ""}
            >
                Sample Manager
            </a>
            {#if $devMode}
                <a 
                    href="#device-tester" 
                    class={currentView === View.DeviceTester ? 'active' : ''}
                >
                    Device Tester
                </a>
            {/if}
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
    {:else if currentView === View.DeviceTester}
        <div in:fade={{ duration: 200 }}>
            <DeviceTester />
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

    a.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        position: relative;
    }

    .dev-indicator {
        font-size: 1.2em;
        opacity: 0.7;
        cursor: help;
    }
</style>