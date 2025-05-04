<script>

    import arrowSpin from '~/assets/icons/arrow-repeat.svg'

    import { current_action } from '~/stores/DeviceUtility.svelte';
</script>

{#if current_action}
    <div><img src={arrowSpin.src} alt="arrow spinning" class="spin"/><i>{current_action}</i></div>
{/if}

<style>
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    div {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 3px;
    }
</style>