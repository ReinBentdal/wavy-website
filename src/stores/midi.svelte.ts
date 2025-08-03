import { MIDIManager } from '~/js/midiManager';
import { bluetoothManager } from './Bluetooth.svelte';

export const midiManager = new MIDIManager(bluetoothManager);

// DeviceTester state - persists across component mounts
export const deviceTesterState = $state({
    keys: [] as any[],
    keyStates: {} as any,
    momentaryPressedKeys: new Set<number>(),
    ccValue: 'N/A',
    ccActive: false,
    testCompleted: false
});

// DeviceTester methods
export function markKeyActive(note: number) {
    const keyIndex = deviceTesterState.keys.findIndex(k => k.id === note);
    
    if (keyIndex === -1) {
        return;
    }

    const key = deviceTesterState.keys[keyIndex];
    const now = Date.now();

    if (!key.timestamp) {
        // First press ever on this key
        key.tested = 'passed';
        key.timestamp = now;
        playTickSound();
    } else {
        const diff = now - key.timestamp;
        if (diff < 300) {
            // Two presses within 300ms: mark as failed
            if (key.tested !== 'failed') {
                key.tested = 'failed';
                playFailSound();
            }
            key.timestamp = now;
        } else {
            // New press after 300ms: blink and reapply active
            key.tested = 'passed';
            key.timestamp = now;
            playTickSound();
        }
    }

    checkTestCompletion();
}

export function handleControlChange(controller: number, value: number) {
    deviceTesterState.ccValue = `${value} (controller ${controller})`;
    if (value > 50 && !deviceTesterState.ccActive) {
        playCCSound();
        deviceTesterState.ccActive = true;
    }
    checkTestCompletion();
}

export function addPressedKey(note: number) {
    deviceTesterState.momentaryPressedKeys.add(note);
    // Trigger reactivity by reassigning
    deviceTesterState.momentaryPressedKeys = new Set(deviceTesterState.momentaryPressedKeys);
}

export function removePressedKey(note: number) {
    deviceTesterState.momentaryPressedKeys.delete(note);
    // Trigger reactivity by reassigning
    deviceTesterState.momentaryPressedKeys = new Set(deviceTesterState.momentaryPressedKeys);
}

export function clearDeviceTesterState() {
    deviceTesterState.keys.forEach(key => {
        key.tested = '';
        key.timestamp = null;
    });
    deviceTesterState.ccValue = 'N/A';
    deviceTesterState.ccActive = false;
    deviceTesterState.testCompleted = false;
}

export function checkTestCompletion() {
    // Check if first two octaves (41-65) are marked as passed
    let firstTwoOctavesComplete = true;
    for (let note = 41; note <= 65; note++) {
        const key = deviceTesterState.keys.find(k => k.id === note);
        if (!key || key.tested !== 'passed') {
            firstTwoOctavesComplete = false;
            break;
        }
    }

    // Check if at least one key above 65 is marked as passed
    let higherKeyPassed = false;
    for (let note = 66; note <= 77; note++) {
        const key = deviceTesterState.keys.find(k => k.id === note);
        if (key && key.tested === 'passed') {
            higherKeyPassed = true;
            break;
        }
    }

    // Check if CC modulation is active
    deviceTesterState.testCompleted = firstTwoOctavesComplete && higherKeyPassed && deviceTesterState.ccActive;
}

// Audio functions
function playTickSound() {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 400;
    gainNode.gain.value = 0.2;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
}

function playFailSound() {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 200;
    gainNode.gain.value = 0.2;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function playCCSound() {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 500;
    gainNode.gain.value = 0.1;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
}

// Set up MIDI event handlers once
midiManager.onNoteOn((note, velocity, channel) => {
    markKeyActive(note);
    console.log('Note On received:', note, 'velocity:', velocity, 'channel:', channel);
    addPressedKey(note);
});

midiManager.onNoteOff((note, velocity, channel) => {
    console.log('Note Off received:', note, 'velocity:', velocity, 'channel:', channel);
    removePressedKey(note);
});

midiManager.onControlChange((controller, value, channel) => {
    handleControlChange(controller, value);
}); 