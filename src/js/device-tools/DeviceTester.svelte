<script>
    import { onMount } from 'svelte';
    import { bluetoothState, bluetoothManager } from '~/stores/Bluetooth.svelte';
    import { midiManager } from '~/stores/midi.svelte';

    // Both SMP and MIDI services work at the same level:
    // - SMP service: Used by DeviceUpdate, SampleManager, etc.
    // - MIDI service: Used by DeviceTester for testing MIDI functionality
    // Both services are accessible simultaneously through their respective managers

    let currentOctaves = $state(3);
    const startingNote = 41;
    let audioCtx = $state(null);
    let soundEnabled = $state(true);

    // UI state
    let ccValue = $state('N/A');
    let ccActive = $state(false);
    let testCompleted = $state(false);

    // Key states
    let keys = $state([]);
    let keyStates = $state({});

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playTickSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.2;
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
    }

    function playCCSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 500;
        gainNode.gain.value = 0.1;
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
    }

    function playFailSound() {
        if (!soundEnabled) return;
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.2;
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    }

    function renderKeybed() {
        keys = [];
        const totalKeys = 12 * currentOctaves;
        for (let i = 0; i < totalKeys; i++) {
            const noteNumber = startingNote + i;
            keys.push({
                id: noteNumber,
                display: i < 25 ? noteNumber.toString() : 'E' + noteNumber,
                tested: '',
                timestamp: null
            });
        }
    }

    // Initialize keys
    renderKeybed();

    function markKeyActive(note) {
        console.log('markKeyActive called with note:', note);
        const keyIndex = keys.findIndex(k => k.id === note);
        console.log('keyIndex:', keyIndex, 'keys length:', keys.length);
        
        if (keyIndex === -1) {
            console.log('Key not found for note:', note);
            return;
        }

        const key = keys[keyIndex];
        const now = Date.now();

        if (!key.timestamp) {
            // First press ever on this key
            console.log('First press on key:', note);
            key.tested = 'passed';
            key.timestamp = now;
            playTickSound();
        } else {
            const diff = now - key.timestamp;
            if (diff < 300) {
                // Two presses within 300ms: mark as failed
                console.log('Double press on key:', note);
                if (key.tested !== 'failed') {
                    key.tested = 'failed';
                    playFailSound();
                }
                key.timestamp = now;
            } else {
                // New press after 300ms: blink and reapply active
                console.log('Re-press on key:', note);
                key.tested = 'passed';
                key.timestamp = now;
                playTickSound();
            }
        }

        checkTestCompletion();
    }

    function handleControlChange(controller, value) {
        ccValue = `${value} (controller ${controller})`;
        if (value > 50 && !ccActive) {
            playCCSound();
            ccActive = true;
        }
        checkTestCompletion();
    }

    function checkTestCompletion() {
        // Check if first two octaves (41-65) are marked as passed
        let firstTwoOctavesComplete = true;
        for (let note = 41; note <= 65; note++) {
            const key = keys.find(k => k.id === note);
            if (!key || key.tested !== 'passed') {
                firstTwoOctavesComplete = false;
                break;
            }
        }

        // Check if at least one key above 65 is marked as passed
        let higherKeyPassed = false;
        for (let note = 66; note <= 77; note++) {
            const key = keys.find(k => k.id === note);
            if (key && key.tested === 'passed') {
                higherKeyPassed = true;
                break;
            }
        }

        // Check if CC modulation is active
        testCompleted = firstTwoOctavesComplete && higherKeyPassed && ccActive;
    }

    // Initialize keybed on mount
    onMount(() => {
        renderKeybed();
    });

    // Set up MIDI event handlers when MIDI is initialized
    $effect(() => {
        if (bluetoothState.connectionState === 'connected') {
            console.log('Device connected, initializing MIDI...');
            
            // Initialize MIDI manager
            midiManager.initialize().then(success => {
                if (success) {
                    console.log('MIDI manager initialized successfully');
                    
                    // Set up high-level MIDI event handlers
                    midiManager.onNoteOn((note, velocity, channel) => {
                        console.log('Note On received:', note, 'velocity:', velocity, 'channel:', channel);
                        markKeyActive(note);
                    });

                    midiManager.onControlChange((controller, value, channel) => {
                        console.log('Control Change received:', controller, 'value:', value, 'channel:', channel);
                        handleControlChange(controller, value);
                    });

                    renderKeybed();
                    clearState();
                    console.log('MIDI event handlers set up');
                } else {
                    console.warn('Failed to initialize MIDI manager');
                }
            });
        }
    });

    function clearState() {
        keys.forEach(key => {
            key.tested = '';
            key.timestamp = null;
        });
        ccValue = 'N/A';
        ccActive = false;
        testCompleted = false;
    }

    function changeOctave() {
        if (currentOctaves === 3) {
            currentOctaves = 4;
        } else {
            currentOctaves = 3;
        }
        renderKeybed();
        clearState();
    }

    onMount(() => {
        renderKeybed();
    });
</script>

    <div class="device-tester">
        <h2>Device Tester</h2>
        
        <div class="controls">
            <button onclick={clearState} disabled={bluetoothState.connectionState !== 'connected'}>
                Clear State
            </button>
            <button onclick={changeOctave} disabled={bluetoothState.connectionState !== 'connected'}>
                Change Octave
            </button>
            
            <div class="cc-display">
                CC Modulation: <span class:cc-active={ccActive}>{ccValue}</span>
            </div>
            
            <div class="sound-toggle">
                <input type="checkbox" bind:checked={soundEnabled} id="soundToggle">
                <label for="soundToggle">Enable Sound</label>
            </div>
        </div>

        <div class="keybed" class:test-completed={testCompleted}>
            {#each keys as key}
                <div 
                    class="key" 
                    class:active={key.tested === 'passed'} 
                    class:failed={key.tested === 'failed'}
                >
                    {key.display}
                </div>
            {/each}
        </div>
    </div>

<style>
    .device-tester {
        padding: 20px;
        max-width: 1000px;
        margin: 0 auto;
    }

    .device-tester h2 {
        font-size: 1.5em;
        margin-bottom: 20px;
    }

    .controls {
        margin-bottom: 20px;
    }

    .controls button {
        margin: 5px;
        padding: 10px 15px;
        font-size: 1em;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .controls button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .controls button:hover:not(:disabled) {
        background: #0056b3;
    }

    .status {
        margin-top: 10px;
        font-weight: bold;
    }

    .cc-display {
        margin-top: 10px;
        font-size: 1.2em;
    }

    .cc-active {
        background-color: #8f8;
        padding: 2px 4px;
        border-radius: 2px;
    }

    .sound-toggle {
        margin-top: 10px;
    }

    .keybed {
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        max-width: 800px;
        border: 2px solid #333;
        padding: 10px;
        border-radius: 4px;
    }

    .keybed.test-completed {
        background-color: #8f8;
        transition: background-color 0.5s;
    }

    .key {
        border: 1px solid #555;
        width: 40px;
        height: 120px;
        margin: 2px;
        line-height: 120px;
        text-align: center;
        user-select: none;
        transition: background-color 0.2s;
        background-color: #eee;
        border-radius: 2px;
    }

    .key.active {
        background-color: #8f8;
    }

    .key.failed {
        background-color: #f88;
    }
</style> 