<script>
    import { bluetoothManager, deviceName } from '~/stores/Bluetooth.svelte';
    import ConnectionStatus from '../ConnectionStatus.svelte';
</script>

<div>
    <nav>
        <div>
        <button onclick={() => bluetoothManager.disconnect()}>
            <i class="bi-bluetooth-disconnect"></i>
            disconnect
            </button>
            <span>{$deviceName}</span>
            <ConnectionStatus />
        </div>
        <div>
            <a>Device Update</a>
            <a>Sample Manager</a>
        </div>
    </nav>
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
    }

    nav > div {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 20px;
    }
</style>