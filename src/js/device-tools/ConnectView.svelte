<script>
    import MonkeyProgramImg from '~/assets/resources/device-tools/monkey_program.png';
    import bluetoothImg from '~/assets/icons/bluetooth.svg'

    import ConnectedView from './ConnectedView.svelte';
    import { onMount } from 'svelte';
    import { bluetoothManager, bluetoothState } from '~/stores/Bluetooth.svelte';
    import { routes } from '~/routes';
    import DeviceBluetoothBrowsers from '../components/DeviceBluetoothBrowsers.svelte';
    
    // The device advertises the MIDI service, so we use that for discovery
    // Both SMP and MIDI services are treated equally once connected
    const BT_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
    const filters = [{ namePrefix: 'WAVY MONKEY', services: [BT_MIDI_SERVICE_UUID] }];
  
    let isBluetoothAvailable = $state(false);
    let isChecking = $state(true);
    let browserSupportNote = $state('');
  
    onMount(async () => {
      if (!navigator.bluetooth) {
        isChecking = false;
        isBluetoothAvailable = false;
        browserSupportNote = 'Web Bluetooth is not available in your browser.';
        return;
      }
  
      try {
        await navigator.bluetooth.getAvailability();
        isBluetoothAvailable = true;
      } catch (error) {
        browserSupportNote = 'Could not detect Bluetooth adapter.';
        isBluetoothAvailable = false;
      } finally {
        isChecking = false;
      }
    });
  
    async function handleConnectClick() {
      await bluetoothManager.connect(filters);
    }
  </script>
  
  <div class="main-content">
    {#if bluetoothState.connectionState !== 'connected'}
      <img src={MonkeyProgramImg.src} alt="Monkey programmer" id="programmer-monkey" />
      <div style="display:flex; align-items: center; flex-direction: column;">
        <h1>device utility</h1>
        <span class="tagline">update and configure your device directly in the browser!</span>
      </div>
      {#if isChecking}
        <div class="spinner">loading</div>
      {:else if !isBluetoothAvailable}
        <DeviceBluetoothBrowsers />
      {:else}
        <button
          class="btn btn-primary"
          disabled={bluetoothState.connectionState === 'connecting'}
          onclick={handleConnectClick}>
          <img src={bluetoothImg.src} alt="bluetooth logo" height="15px" />
          {#if bluetoothState.connectionState === 'connecting'}
            Connecting...
          {:else}
            <i class="bi-bluetooth"></i> Click to connect
          {/if}
        </button>
  
        <p class="note" style="max-width: 400px; text-align: center;">
          If you are having problems finding your device, make sure it is not already connected to anything else. <!-- <a href={routes.monkeyConnect}>read more</a>> -->
        </p>
      {/if}
    {:else}
      <ConnectedView />
    {/if}
  </div>

  <style>
    button {
      background-color: #0082FC;
      color: white;
    }
  </style>