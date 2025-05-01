
<script>
    import { sampleState, deviceSampleUploadDefault } from "~/stores/SampleManager.svelte";

    const storagePercentage = $derived(sampleState.storageUsed != null && sampleState.storageTotal != null ? (sampleState.storageUsed/sampleState.storageTotal * 100).toFixed(1) : "??.?")

    const namedIds = $derived.by(() => {
        return sampleState.IDs?.map((id) => {
            return [id, sampleState?.names[id.toString()] ?? "no name"]
        }) ?? null;
    }) 
</script>


<div class="content">
    <div class="main-content">
        <div class="console">
            <h1>Sample Manager</h1>
            <span>The presets in <b>DRM</b> are each a pack of drum loop samples. Here you can see which are currently loaded on your device.</span>
        </div>
        <button 
            onclick={deviceSampleUploadDefault} 
            disabled={sampleState.uploadPercentage != null}
        >
            {#if sampleState.uploadPercentage != null}
                Uploading... {sampleState.uploadPercentage}%
            {:else}
                Reupload default samples
            {/if}
        </button>
        <div>Storage used: {storagePercentage}%</div>
            
        {#if namedIds != null}
        <table>
            <tbody>
                <tr>
                    <th>Preset number</th>
                    <th>Pack name</th>
                </tr>
                {#each namedIds.slice(1) as id, i}
                    <tr>
                        <td>{i+1}</td>
                        <td>{id[0] == 65535 ? '-' : id[1]}</td>
                    </tr>
                {/each}
                {#if namedIds.length > 0}
                    <tr>
                        <td>0</td>
                        <td>{namedIds[0][0] == 65535 ? '-' : namedIds[0][1]}</td>
                    </tr>
                {/if}
            </tbody>
        </table>
        {/if}
        
        <p>🚧 You will soon be able to upload other drum loops 🚧</p>
        <br />
        <br />
        <br />
        <br />
        <p><i>This page is <a target="_blank" href="https://github.com/ReinBentdal/wavy-website">open-source</a></i>. Contributions are very welcome.</p>
    </div>
</div>

<style>
    table {
        border: 1px solid black;
        border-radius: 3px;
        padding: 10px;
        text-align: left;
    }
    .content {
        padding: 20px;
    }

    .main-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .console {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
</style> 