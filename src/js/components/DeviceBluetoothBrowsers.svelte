<script>
    import { getOperatingSystem } from "../utils/operating_system";

    import chrome from '~/assets/icons/browsers/browser-chrome.svg'
    import edge from '~/assets/icons/browsers/browser-edge.svg'
    import bluefy from '~/assets/icons/browsers/browser-bluefy.webp'

    const os = getOperatingSystem()
</script>

<div class="note" style="text-align: center;">

        It looks like your browser does not support Bluetooth :/<br />
        {#if os === 'Windows'}
        <p>Use Chrome or Edge on Windows.</p>
            <div class="browser-icons">
                <img src={chrome.src} alt="Google Chrome" title="Google Chrome" height="32px" />
                <img src={edge.src} alt="Microsoft Edge" title="Microsoft Edge" height="32px" />
            </div>
        {:else if os === 'MacOS'}
        <p>Use a Chrome browser on macOS.</p>
            <div class="browser-icons">
                <img src={chrome.src} alt="Google Chrome" title="Google Chrome" height="32px" />
            </div>
        {:else if os === 'Linux'}
        <p>Use a Chrome browser on Linux.</p>
            <div class="browser-icons">
                <img src={chrome.src} alt="Google Chrome" title="Google Chrome" height="32px" />
            </div>
        {:else if os === 'Android'}
        <p>Use a Chrome browser on Android.</p>
            <div class="browser-icons">
                <img src={chrome.src} alt="Google Chrome" title="Google Chrome" height="32px" />
            </div>
        {:else if os === 'iOS'}
        <p>Use Bluefy on iOS/iPad OS.</p>
            <div class="browser-icons">
                <a href="https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055">
                <img src={bluefy.src} alt="Bluefy" title="Bluefy" height="32px" />
                </a>
            </div>
        {:else}
        <p>Browser support may be limited on your operating system.</p>
            <div class="browser-icons">
                <img src={unknown.src} alt="Unknown browser" title="Unknown browser" height="32px" />
            </div>
        {/if}


</div>

<style>
    img {
        margin: 20px 10px;
        height: 40px;
        border-radius: 10%;
    }
    .browser-icons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    p {
        text-align: center;
        margin: 0;
    }
</style>