<script>
    const { init, onChange } = $props();

    let on = $state(init);

    $effect(() => {
        onChange?.(on);
    });
</script>

<div class="toggle-container">
    <label class="switch">
        <input type="checkbox" bind:checked={on} />
        <span class="slider"></span>
    </label>
</div>

<style>
    .toggle-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
    }

    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: 0.4s;
        border-radius: 13px;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }

    input:checked + .slider {
        background-color: #f39c21;
    }

    input:checked + .slider:before {
        transform: translateX(24px);
    }
</style>
