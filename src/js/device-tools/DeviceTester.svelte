<script>
    import { onMount } from 'svelte';
    import { bluetoothState, bluetoothManager } from '~/stores/Bluetooth.svelte';
    import { midiManager, deviceTesterState, clearDeviceTesterState } from '~/stores/midi.svelte';

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
    let momentaryPressedKeys = $state(new Set()); // Track currently pressed keys

    // For reactive collections in Svelte runes, we need to trigger reactivity manually
    function addPressedKey(note) {
        momentaryPressedKeys.add(note);
        // Trigger reactivity by reassigning
        momentaryPressedKeys = new Set(momentaryPressedKeys);
    }

    function removePressedKey(note) {
        momentaryPressedKeys.delete(note);
        // Trigger reactivity by reassigning
        momentaryPressedKeys = new Set(momentaryPressedKeys);
    }

    // Reactive statement to ensure Svelte detects set changes
    let momentaryPressedKeysSize = $derived(momentaryPressedKeys.size);

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
        // Also update the store
        deviceTesterState.keys = keys;
    }

    // Initialize keys
    renderKeybed();

    // Initialize keybed on mount
    onMount(() => {
        renderKeybed();
    });

    // Initialize MIDI when connected
    $effect(() => {
        if (bluetoothState.connectionState === 'connected') {
            midiManager.initialize().then(success => {
                if (success) {
                    console.log('MIDI manager initialized successfully');
                    renderKeybed();
                    clearDeviceTesterState();
                } else {
                    console.warn('Failed to initialize MIDI manager');
                }
            });
        }
    });

    // Helper functions for keyboard layout
    function isBlackKey(note) {
        // MIDI note 41 is F, so we need to map from F onwards
        // F=41(white), F#=42(black), G=43(white), G#=44(black), A=45(white), A#=46(black), B=47(white), C=48(white), C#=49(black), D=50(white), D#=51(black), E=52(white)
        const noteInOctave = (note - 41) % 12;
        // Black keys are at positions 1, 3, 5, 8, 10 in the octave (0-based)
        return [1, 3, 5, 8, 10].includes(noteInOctave);
    }

    function getKeyPosition(note) {
        // MIDI note 41 is F, which should be a white key
        // Let's map the notes properly starting from F (41)
        const startNote = 41; // F
        const relativeNote = note - startNote;
        
        // Each octave has 7 white keys, so we need to calculate position
        const octave = Math.floor(relativeNote / 12);
        const noteInOctave = relativeNote % 12;
        
        // Map each note in the octave to its position (F=0, F#=0.5, G=1, etc.)
        // F=0, F#=1, G=2, G#=3, A=4, A#=5, B=6, C=7, C#=8, D=9, D#=10, E=11
        const notePositions = {
            0: 0,   // F (white key)
            1: 0.5, // F# (black key)
            2: 1,   // G (white key)
            3: 1.5, // G# (black key)
            4: 2,   // A (white key)
            5: 2.5, // A# (black key)
            6: 3,   // B (white key)
            7: 4,   // C (white key) - new octave starts
            8: 4.5, // C# (black key)
            9: 5,   // D (white key)
            10: 5.5, // D# (black key)
            11: 6   // E (white key)
        };
        
        const position = (octave * 7) + notePositions[noteInOctave];
        return position;
    }

    function getCCValue() {
        if (deviceTesterState.ccValue === 'N/A') return 0;
        const value = parseInt(deviceTesterState.ccValue.split(' ')[0]);
        return isNaN(value) ? 0 : value;
    }

    function getCCPercentage() {
        return (getCCValue() / 127) * 100;
    }

    function isKeyTested(note) {
        const key = deviceTesterState.keys.find(k => k.id === note);
        return key && key.tested === 'passed';
    }

    function isKeyFailed(note) {
        const key = deviceTesterState.keys.find(k => k.id === note);
        return key && key.tested === 'failed';
    }
</script>

    <div class="device-tester">
        <h2>Device Tester</h2>
        
        <div class="controls">
            <button onclick={clearDeviceTesterState} disabled={bluetoothState.connectionState !== 'connected'}>
                Clear State
            </button>
            
            <div class="sound-toggle">
                <input type="checkbox" bind:checked={soundEnabled} id="soundToggle">
                <label for="soundToggle">Enable Sound</label>
            </div>
        </div>

        <div class="cc-display">
            <div class="cc-label">CC Modulation:</div>
            <div class="cc-bar-container">
                <div class="cc-bar" style="width: {getCCPercentage()}%"></div>
                <div class="cc-threshold-line"></div>
                <div class="cc-threshold">Threshold: 50</div>
            </div>
            <div class="cc-value">{deviceTesterState.ccValue}</div>
        </div>

        <div class="keyboard" class:test-completed={deviceTesterState.testCompleted}>
            {#each deviceTesterState.keys.filter(k => k.id >= 41 && k.id <= 77).sort((a, b) => a.id - b.id) as key}
                {#if key.display.startsWith('E')}
                    <!-- Extra keys with keyboard style -->
                    <div 
                        class="key extra-key-style" 
                        class:black-key={isBlackKey(key.id)}
                        class:tested={isKeyTested(key.id)}
                        class:failed={isKeyFailed(key.id)}
                        class:pressed={deviceTesterState.momentaryPressedKeys.has(key.id)}
                        style="left: {getKeyPosition(key.id) * 30}px"
                    >
                        {key.display}
                    </div>
                {:else}
                    <!-- Main keyboard layout -->
                    <div 
                        class="key" 
                        class:black-key={isBlackKey(key.id)}
                        class:tested={isKeyTested(key.id)}
                        class:failed={isKeyFailed(key.id)}
                        class:pressed={deviceTesterState.momentaryPressedKeys.has(key.id)}
                        style="left: {getKeyPosition(key.id) * 30}px"
                    >
                        {key.display}
                    </div>
                {/if}
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
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 20px;
    }

    .controls button {
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

    .sound-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .cc-display {
        margin-bottom: 20px;
    }

    .cc-label {
        font-weight: bold;
        margin-bottom: 8px;
    }

    .cc-bar-container {
        position: relative;
        height: 20px;
        background: #eee;
        border-radius: 10px;
        margin-bottom: 8px;
        overflow: hidden;
    }

    .cc-bar {
        height: 100%;
        background: #007bff;
        width: 0%;
    }

    .cc-threshold-line {
        position: absolute;
        left: 39.4%; /* 50/127 * 100 = 39.4% */
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ff4444;
        z-index: 1;
    }

    .cc-threshold {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.8em;
        color: #666;
    }

    .cc-value {
        font-size: 0.9em;
        color: #666;
    }

    .keyboard {
        position: relative;
        height: 200px;
        margin-top: 20px;
        border: 2px solid #333;
        padding: 10px;
        border-radius: 4px;
        overflow: hidden;
    }

    .keyboard.test-completed {
        background-color: #8f8;
        transition: background-color 0.5s;
    }

    .keyboard-row {
        display: flex;
        position: relative;
        height: 60px;
    }

    .key {
        position: absolute;
        width: 28px;
        height: 120px;
        border: 1px solid #555;
        background-color: #fff;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 8px;
        font-size: 0.8em;
        user-select: none;
        transition: all 0.2s ease;
        border-radius: 2px 2px 4px 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        top: 0;
    }

    .key.black-key {
        width: 18px;
        height: 80px;
        background-color: #333;
        color: white;
        z-index: 1;
        border-radius: 0 0 2px 2px;
        top: 0;
    }

    .key.active {
        background-color: #8f8;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.black-key.active {
        background-color: #4CAF50;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.tested {
        background-color: #8f8;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.black-key.tested {
        background-color: #4CAF50;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.failed {
        background-color: #f88;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.black-key.failed {
        background-color: #F44336;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.pressed {
        background-color: #2196F3;
        color: white;
        transform: translateY(4px);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
    }

    .key.black-key.pressed {
        background-color: #2196F3;
        color: white;
        transform: translateY(4px);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
    }

    .key.extra-key-style {
        width: 28px; /* Match main key width */
        height: 120px; /* Match main key height */
        border: 1px solid #555;
        background-color: #fff;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 8px;
        font-size: 0.8em;
        user-select: none;
        transition: all 0.2s ease;
        border-radius: 2px 2px 4px 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        top: 0;
    }

    .key.extra-key-style.black-key {
        width: 18px;
        height: 80px;
        background-color: #333;
        color: white;
        z-index: 1;
        border-radius: 0 0 2px 2px;
        top: 0;
    }

    .key.extra-key-style.tested {
        background-color: #8f8;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.extra-key-style.black-key.tested {
        background-color: #4CAF50;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.extra-key-style.failed {
        background-color: #f88;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.extra-key-style.black-key.failed {
        background-color: #F44336;
        transform: translateY(2px);
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .key.extra-key-style.pressed {
        background-color: #2196F3;
        color: white;
        transform: translateY(4px);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
    }

    .key.extra-key-style.black-key.pressed {
        background-color: #2196F3;
        color: white;
        transform: translateY(4px);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
    }
</style> 