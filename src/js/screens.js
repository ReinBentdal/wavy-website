export class Screens {
    constructor(initial) {
        this.current = initial;
        if (this.current !== undefined) {
            document.getElementById(this.current).style.display = "block";
        }
    }
    set(screen) {
        if (this.current !== undefined) {
            document.getElementById(this.current).style.removeProperty("display");
        }
        this.current = screen;
        if (this.current !== undefined) {
            document.getElementById(this.current).style.display = "block";
        }
    }

    get() {
        return this.current;
    }
}