export class Screens {
    constructor(initial, validScreens) {
        this.validScreens = validScreens; // Array of valid screen IDs
        this.current = undefined;
        this.callbacks = {};

        if (!initial) return

        if (this.isValidScreen(initial)) {
            this.current = initial;
            document.getElementById(this.current).style.display = "block";
            this.triggerCallback(this.current);
        } else {
            console.error(`Invalid initial screen: ${initial}`);
        }
    }

    set(screen) {
        if (this.isValidScreen(screen)) {
            if (this.current !== undefined) {
                document.getElementById(this.current).style.removeProperty("display");
                this.triggerCallback(this.current, 'hide');
            }
            this.current = screen;
            document.getElementById(this.current).style.display = "block";
            this.triggerCallback(this.current);
        } else {
            console.error(`Invalid screen ID: ${screen}`);
        }
    }

    get() {
        return this.current;
    }

    on(screen, callback, action = 'show') {
        if (this.isValidScreen(screen)) {
            if (!this.callbacks[screen]) {
                this.callbacks[screen] = {};
            }
            this.callbacks[screen][action] = callback;
        } else {
            console.error(`Invalid screen ID for callbacks: ${screen}`);
        }
    }

    triggerCallback(screen, action = 'show') {
        if (this.callbacks[screen] && this.callbacks[screen][action]) {
            this.callbacks[screen][action]();
        }
    }

    isValidScreen(screen) {
        // Check if the screen is in the validScreens array and exists in the document
        return this.validScreens.includes(screen) && document.getElementById(screen) !== null;
    }
}
