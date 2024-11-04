
export const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

/* basic log module */
export class Log {
    static LEVEL_DEBUG = 0;
    static LEVEL_INFO = 1;
    static LEVEL_WARNING = 2;
    static LEVEL_ERROR = 3;
    static LEVEL_IMPORTANT = 4;

    static #LEVEL_DEBUG_COLOR = 'gray';
    static #LEVEL_INFO_COLOR = 'white';
    static #LEVEL_WARNING_COLOR = 'yellow';
    static #LEVEL_ERROR_COLOR = 'red';
    static #LEVEL_IMPORTANT_COLOR = 'blue';

    #name;
    #level;

    constructor(name, level) {
        this.#name = name;
        this.#level = level;
    }

    #print(message, color) {
        // if message is a object, print it on next line
        if (typeof message === 'object') {
            console.log(`%c${this.#name}: ⬇︎`, `color: ${color}`);
            console.log(message);
            return;
        }
        console.log(`%c${this.#name}: ${message}`, `color: ${color}`);
    }

    debug(message) {
        if (this.#level <= Log.LEVEL_DEBUG) {
            this.#print(message, Log.#LEVEL_DEBUG_COLOR);
        }
    }

    info(message) {
        if (this.#level <= Log.LEVEL_INFO) {
            this.#print(message, Log.#LEVEL_INFO_COLOR);
        }
    }

    warning(message) {
        if (this.#level <= Log.LEVEL_WARNING) {
            this.#print(message, Log.#LEVEL_WARNING_COLOR);
        }
    }

    error(message) {
        if (this.#level <= Log.LEVEL_ERROR) {
            this.#print(message, Log.#LEVEL_ERROR_COLOR);
        }
    }

    important(message) {
        if (this.#level <= Log.LEVEL_IMPORTANT) {
            this.#print(message, Log.#LEVEL_IMPORTANT_COLOR);
        }
    }
}

export const imageHash = (image) => {
    return crypto.subtle.digest('SHA-256', image);
}

export const imageInfo = async (image) => {
    // https://interrupt.memfault.com/blog/mcuboot-overview#mcuboot-image-binaries

    const info = {};
    const view = new Uint8Array(image);

    // check header length
    if (view.length < 32) {
        throw new Error('Invalid image (too short file)');
    }

    // check MAGIC bytes 0x96f3b83d
    if (view[0] !== 0x3d || view[1] !== 0xb8 || view[2] !== 0xf3 || view[3] !== 0x96) {
        throw new Error('Invalid image (wrong magic bytes)');
    }

    // check load address is 0x00000000
    if (view[4] !== 0x00 || view[5] !== 0x00 || view[6] !== 0x00 || view[7] !== 0x00) {
        throw new Error('Invalid image (wrong load address)');
    }

    const headerSize = view[8] + view[9] * 2 ** 8;

    // check protected TLV area size is 0
    if (view[10] !== 0x00 || view[11] !== 0x00) {
        throw new Error('Invalid image (wrong protected TLV area size)');
    }

    const imageSize = view[12] + view[13] * 2 ** 8 + view[14] * 2 ** 16 + view[15] * 2 ** 24;
    info.imageSize = imageSize;

    // check image size is correct
    if (view.length < imageSize + headerSize) {
        throw new Error('Invalid image (wrong image size)');
    }

    // check flags is 0x00000000
    if (view[16] !== 0x00 || view[17] !== 0x00 || view[18] !== 0x00 || view[19] !== 0x00) {
        throw new Error('Invalid image (wrong flags)');
    }

    const version = `${view[20]}.${view[21]}.${view[22] + view[23] * 2 ** 8}`;
    info.version = version;

    info.hash = [...new Uint8Array(await imageHash(image.slice(0, imageSize + 32)))].map(b => b.toString(16).padStart(2, '0')).join('');

    return info;
}

export function canonicalize(obj) {
    if (Array.isArray(obj)) {
        // If it's an array, canonicalize each element
        return obj.map(canonicalize);
    } else if (obj && typeof obj === 'object') {
        // If it's an object, sort the keys
        const sortedKeys = Object.keys(obj).sort();
        const result = {};
        for (const key of sortedKeys) {
            result[key] = canonicalize(obj[key]);
        }
        return result;
    } else {
        // If it's a primitive value, return it as is
        return obj;
    }
}
