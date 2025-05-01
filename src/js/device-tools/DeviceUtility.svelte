<script>
    import ConnectView from './ConnectView.svelte';
    import ConnectedView from './ConnectedView.svelte';
    import { bluetoothState } from '~/stores/Bluetooth.svelte';
</script>

<section style="flex-grow: 2; display: flex; flex-direction: column; align-items: center;">
    {#if bluetoothState.connectionState == 'disconnected' || bluetoothState.connectionState == 'connecting'}
        <ConnectView />
    {:else}
        <ConnectedView />
    {/if}
</section>
