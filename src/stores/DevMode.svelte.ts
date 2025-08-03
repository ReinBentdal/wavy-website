import { writable } from 'svelte/store';

// Dev mode state with localStorage persistence
function createDevModeStore() {
    const { subscribe, set, update } = writable(false);

    // Initialize from localStorage
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('wavy_dev_mode');
        set(stored === 'true');
    }

    return {
        subscribe,
        enable: () => {
            set(true);
            if (typeof window !== 'undefined') {
                localStorage.setItem('wavy_dev_mode', 'true');
            }
        },
        disable: () => {
            set(false);
            if (typeof window !== 'undefined') {
                localStorage.setItem('wavy_dev_mode', 'false');
            }
        },
        toggle: () => {
            update(current => {
                const newValue = !current;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('wavy_dev_mode', newValue.toString());
                }
                return newValue;
            });
        }
    };
}

export const devMode = createDevModeStore();

// Console command handler
if (typeof window !== 'undefined') {
    // Override console.log to detect dev mode commands
    const originalLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        
        // Check for dev mode commands
        if (message.toLowerCase().includes('enable dev mode') || 
            message.toLowerCase().includes('dev mode enable') ||
            message.toLowerCase().includes('wavy dev mode')) {
            devMode.enable();
            originalLog.call(console, '🔧 Dev mode enabled! Device Tester tab is now available.');
            return;
        }
        
        if (message.toLowerCase().includes('disable dev mode') || 
            message.toLowerCase().includes('dev mode disable')) {
            devMode.disable();
            originalLog.call(console, '🔧 Dev mode disabled.');
            return;
        }
        
        // Call original console.log
        originalLog.apply(console, args);
    };


} 