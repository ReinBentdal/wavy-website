<script>
    import ConnectView from './ConnectView.svelte';
    import ConnectedView from './ConnectedView.svelte';
    import { connectionState } from '~/stores/Bluetooth.svelte';
</script>

<section style="flex-grow: 2; display: flex; flex-direction: column; align-items: center;">
    {#if $connectionState !== 'disconnected' && $connectionState !== 'connecting'}
        <ConnectedView />
    {:else}
        <ConnectView />
    {/if}
</section>
