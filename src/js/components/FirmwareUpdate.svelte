<script>
    const { stage, uploadProgress } = $props();
</script>

<div class="update-stages">
    <div class="stage" class:active={stage === 'fetching'}>
        fetching new firmware
    </div>
    <div class="stage" class:active={stage === 'uploading'}>
        uploading firmware {#if stage === 'uploading'}({uploadProgress}%){/if}
    </div>
    <div class="stage" class:active={stage === 'applying'}>
        applying update (waiting on device)
    </div>
    <div class="stage" class:active={stage === 'verifying'}>
        verifying update
    </div>
    <div class="stage" class:active={stage === 'done'}>
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
</style>