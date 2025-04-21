
<script>
    import { sampleState, deviceSamplesUpload } from "~/stores/SampleManager.svelte";


    const namedIds = $derived.by(() => {
        return sampleState.IDs?.map((id) => {
            return [id, sampleState?.IDMap[id.toString()] ?? "no name"]
        }) ?? null;
    }) 
</script>


<div class="content">
    <h1>Sample Manager</h1>
    <button 
        onclick={deviceSamplesUpload} 
        disabled={sampleState.uploadPercentage != null}
    >
        {#if sampleState.uploadPercentage != null}
            Uploading... {sampleState.uploadPercentage}%
        {:else}
            Reupload samples
        {/if}
    </button>
    <div>Storage used: {sampleState.storageUsed?.toFixed(1)}%</div>
    <div>
        Sample preset names:
        {#if namedIds != null}
        <ol>
            {#each namedIds.slice(1) as id}
                <li>{id[0] == 65535 ? 'Empty' : id[1]}</li>
            {/each}
            {#if namedIds.length > 0}
                <li>{namedIds[0][0] == 65535 ? 'Empty' : namedIds[0][1]}</li>
            {/if}
        </ol>

        <p>🚧 You will soon be able to upload other drum loops 🚧</p>
        {/if}
    </div>
</div>

<style>
    .content {
        padding: 20px;
    }
</style>