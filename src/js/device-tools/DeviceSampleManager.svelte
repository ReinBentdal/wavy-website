
<script>
    import { sampleState } from "~/stores/SampleManager.svelte";
</script>


<div class="content">
    <h1>Sample Manager</h1>

    <div>Storage used: {sampleState.storageUsed?.toFixed(1)}%</div>
    <div>
        IDs (actually starts on idx 0)
        <ol>
        {#each sampleState.IDs?.slice(1, 10) as id}
            <li>{id == 65535 ? 'Empty' : id}</li>
        {/each}
        {#if sampleState.IDs?.length > 0}
            <li>{sampleState.IDs[0] == 65535 ? 'Empty' : sampleState.IDs[0]}</li>
        {/if}
        <ol>
    </div>
</div>

<style>
    .content {
        padding: 20px;
    }
</style>