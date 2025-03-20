<script>
    import MonkeyProgramImg from '~/assets/resources/device-tools/monkey_program.png';
    import ConnectedView from './ConnectedView.svelte';
    import { onMount } from 'svelte';
    import { bluetoothManager, connectionState } from '~/stores/Bluetooth.svelte';
    
    const BT_MIDI_SERVICE_UUID = '03B80E5A-EDE8-4B33-A751-6CE34EC4C700'.toLowerCase();
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
    {#if $connectionState !== 'connected'}
      <img src={MonkeyProgramImg.src} alt="Monkey programmer" id="programmer-monkey" />
      <div style="display:flex; align-items: center; flex-direction: column;">
        <h1>device utility</h1>
        <span class="tagline">update and configure your device directly in the browser!</span>
      </div>
      {#if isChecking}
        <div class="spinner">loading</div>
      {:else if !isBluetoothAvailable}
        <p class="note" style="text-align: center;">
          It looks like your browser is not supported :/<br />
          <span>{browserSupportNote}</span>
        </p>
      {:else}
        <button
          class="btn btn-primary"
          disabled={$connectionState === 'connecting'}
          onclick={handleConnectClick}>
          <i class="bi-bluetooth"></i>
          {#if $connectionState === 'connecting'}
            Connecting...
          {:else}
            Connect
          {/if}
        </button>
  
        <p class="note" style="max-width: 400px; text-align: center;">
          If you have problems finding your device, make sure it is not already connected to something else.
        </p>
      {/if}
    {:else}
      <ConnectedView />
    {/if}
  </div>