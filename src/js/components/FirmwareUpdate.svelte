<script>
    const { stage, uploadProgress } = $props();
</script>

<div class="update-stages">
    <div class="stage" class:active={stage === 'fetching'}>
        {#if stage === 'fetching'}
            <div class="spinner"></div>
        {:else if ['uploading', 'applying', 'verifying', 'done'].includes(stage)}
            <div class="checkmark">✓</div>
        {/if}
        fetching new firmware
    </div>
    <div class="stage" class:active={stage === 'uploading'}>
        {#if stage === 'uploading'}
            <div class="spinner"></div>
        {:else if ['applying', 'verifying', 'done'].includes(stage)}
            <div class="checkmark">✓</div>
        {/if}
        uploading firmware {#if stage === 'uploading'}({#if uploadProgress === 0}starting{:else}{uploadProgress}%{/if}){/if}
    </div>
    <div class="stage" class:active={stage === 'applying'}>
        {#if stage === 'applying'}
            <div class="spinner"></div>
        {:else if ['verifying', 'done'].includes(stage)}
            <div class="checkmark">✓</div>
        {/if}
        applying update (waiting on device)
    </div>
    <div class="stage" class:active={stage === 'verifying'}>
        {#if stage === 'verifying'}
            <div class="spinner"></div>
        {:else if ['done'].includes(stage)}
            <div class="checkmark">✓</div>
        {/if}
        verifying update
    </div>
    <div class="stage" class:active={stage === 'done'}>
        {#if stage === 'done'}
            <div class="checkmark">✓</div>
        {/if}
        done!
    </div>
</div>

<style>
    .update-stages {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .stage {
        opacity: 0.5;
    }

    .stage.active {
        opacity: 1;
        font-weight: bold;
    }

    .spinner {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        margin-right: 0.5em;
    }

    .checkmark {
        display: inline-block;
        margin-right: 0.5em;
        color: green;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>