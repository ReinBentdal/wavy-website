
<script>
    import { sampleState } from "~/stores/SampleManager.svelte";
</script>


<div class="content">
    <h1>Sample Manager</h1>

    <div>Storage used: {sampleState.storageUsed?.toFixed(1)}%</div>
    <div>
        IDs (actually starts on idx 0)
        <ol>
        {#each sampleState.IDs as id}
            <li>{id} </li>
        {/each}
        <ol>
    </div>
</div>

<style>
    .content {
        padding: 20px;
    }
</style>