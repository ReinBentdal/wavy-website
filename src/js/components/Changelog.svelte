<script>
    import { imageState } from "~/stores/ImageManager.svelte";

    const changelog = $derived(imageState.changelog);

    const { beta } = $props();
</script>

<div id="changelog">
    <h3>Changelog</h3>
    {#each changelog?.versions as version}
        {#if !version.isObsolete && (!version.isDev || beta)}
            <div class="changelog-item">
                <p>
                    <span class="changelog-header">
                    {version.version.versionString}
                    {#if version.highlight}
                    {version.highlight}{/if}
                    <b>
                        {#if version.isDev}
                            [BETA]{/if}
                    </b>
                    </span>
                    <span><i>{version.date ?? ""}</i></span>
                </p>
                {#each version.changes as change}
                    - {change}<br />
                {/each}
            </div>
        {/if}
    {/each}
</div>

<style>
#changelog {
    display: inline-flex;
    flex-direction: column;
    gap: 10px;
    width: 400px;
}
.changelog-item {
    border: 1px solid black;
    border-radius: 3px;
    padding: 10px;
}
.changelog-item > p {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
}
</style>