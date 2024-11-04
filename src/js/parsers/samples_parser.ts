// Define constants
export const CONFIG_KEYBED_SIZE = 25; // Adjust this value if your keybed size is different
export const TICKS_PER_BEAT = 24; // 24 ticks per beat
export const NUM_PAGES = 10;
export const PRESETS_PER_PAGE = CONFIG_KEYBED_SIZE;
export const SAMPLE_PACK_INFO_SIZE = 4 * 4; // 4 uint32_t values
export const OFFSET_SIZE = NUM_PAGES * PRESETS_PER_PAGE * 2; // 2 bytes per offset
export const HEADER_SIZE = SAMPLE_PACK_INFO_SIZE + OFFSET_SIZE;

// Define event type
export interface NoteEvent {
    note: number; // int8_t
    state: number;
    velocity: number;
}

// Tuple of note event and time ticks
export type NoteEventTime = [number, NoteEvent];

// Define loop data structure
export interface LoopData {
    length: number;
    events: NoteEventTime[];
}

// Define the type for pages, each page is an array of loops
export type Page = LoopData[];

// Define the sample pack type
export interface SamplePack {
    // Pack info
    id: number; // uint32_t
    reserved1?: number; // uint32_t
    reserved2?: number; // uint32_t
    reserved3?: number; // uint32_t

    // Pack content
    pages: Page[];
}

// Helper functions to write data in little-endian format
function writeInt8(array: number[], value: number): void {
    array.push(value & 0xFF);
}

function writeUint8(array: number[], value: number): void {
    array.push(value & 0xFF);
}

function writeUint16LE(array: number[], value: number): void {
    array.push(value & 0xFF);
    array.push((value >> 8) & 0xFF);
}

function writeUint32LE(array: number[], value: number): void {
    array.push(value & 0xFF);
    array.push((value >> 8) & 0xFF);
    array.push((value >> 16) & 0xFF);
    array.push((value >> 24) & 0xFF);
}

// Helper functions to read data in little-endian format
function readInt8(value: number): number {
    return value << 24 >> 24; // Sign-extend to 32 bits
}

function readUint16LE(array: Uint8Array, index: number): number {
    return array[index] | (array[index + 1] << 8);
}

function readUint32LE(array: Uint8Array, index: number): number {
    return (
        (array[index] |
            (array[index + 1] << 8) |
            (array[index + 2] << 16) |
            (array[index + 3] << 24)) >>> 0
    );
}

// Function to write the header
function writeHeader(byteArray: number[], samplePack: SamplePack): void {
    writeUint32LE(byteArray, samplePack.id);
    writeUint32LE(byteArray, samplePack.reserved1 || 0xFFFFFFFF);
    writeUint32LE(byteArray, samplePack.reserved2 || 0xFFFFFFFF);
    writeUint32LE(byteArray, samplePack.reserved3 || 0xFFFFFFFF);
}

// Function to read the header
function readHeader(packedData: Uint8Array): { samplePack: SamplePack; position: number } {
    let position = 0;
    const id = readUint32LE(packedData, position);
    position += 4;
    const reserved1 = readUint32LE(packedData, position);
    position += 4;
    const reserved2 = readUint32LE(packedData, position);
    position += 4;
    const reserved3 = readUint32LE(packedData, position);
    position += 4;
    const samplePack: SamplePack = {
        id: id,
        reserved1: reserved1,
        reserved2: reserved2,
        reserved3: reserved3,
        pages: [],
    };
    return { samplePack, position };
}

// Function to write a loop
function writeLoop(byteArray: number[], loop: LoopData): void {
    writeUint8(byteArray, loop.length); // loop_length (uint8_t)
    writeUint8(byteArray, loop.events.length); // num_events (uint8_t)

    for (const event of loop.events) {
        writeInt8(byteArray, event[1].note); // note (int8_t)
        const data = (event[1].state << 7) | (event[1].velocity & 0x7F);
        writeUint8(byteArray, data); // data (uint8_t)
        writeUint16LE(byteArray, event[0]); // time_ticks (uint16_t)
    }
}

// Function to read a loop
function readLoop(
    packedData: Uint8Array,
    position: number
): { loopData: LoopData; newPosition: number } {
    const loopLength = packedData[position++];
    const numEvents = packedData[position++];

    const events: NoteEventTime[] = [];

    for (let eventIndex = 0; eventIndex < numEvents; eventIndex++) {
        const note = readInt8(packedData[position++]);
        const data = packedData[position++];
        const state = (data >> 7) & 0x01;
        const velocity = data & 0x7F;
        const timeTicks = readUint16LE(packedData, position);
        position += 2;

        events.push([
            timeTicks,
            {
                note: note,
                state: state,
                velocity: velocity,
            },
        ]);
    }

    const loopData: LoopData = {
        length: loopLength,
        events: events,
    };

    return { loopData, newPosition: position };
}

// Main function to encode the sample pack
export function samplesParser_encode(samplePack: SamplePack): Uint8Array {
    const byteArray: number[] = []; // Final byte array
    const presetOffsets = new Array(NUM_PAGES * PRESETS_PER_PAGE).fill(0xFFFF); // Initialize preset offsets

    // Write header
    writeHeader(byteArray, samplePack);

    // Reserve space for the preset offsets
    for (let i = 0; i < OFFSET_SIZE; i++) {
        writeUint8(byteArray, 0xFF);
    }

    let currentOffset = HEADER_SIZE; // Start after the header

    // Encode loops and update offsets
    for (let pageIndex = 0; pageIndex < NUM_PAGES; pageIndex++) {
        const page = samplePack.pages[pageIndex];
        for (let presetIndex = 0; presetIndex < PRESETS_PER_PAGE; presetIndex++) {
            const loop = page[presetIndex];
            const offsetIndex = pageIndex * PRESETS_PER_PAGE + presetIndex;
            if (loop !== null && loop !== undefined) {
                const offsetRelativeToHeader = currentOffset - HEADER_SIZE;
                presetOffsets[offsetIndex] = offsetRelativeToHeader;
                writeLoop(byteArray, loop);
                currentOffset = byteArray.length;
            }
        }
    }

    // Write presetOffsets back into byteArray at positions after the header
    let offsetPosition = SAMPLE_PACK_INFO_SIZE;
    for (let i = 0; i < presetOffsets.length; i++) {
        const offsetValue = presetOffsets[i];
        byteArray[offsetPosition++] = offsetValue & 0xFF;
        byteArray[offsetPosition++] = (offsetValue >> 8) & 0xFF;
    }

    return Uint8Array.from(byteArray);
}

// Main function to decode the sample pack
export function samplesParser_decode(packedData: Uint8Array): SamplePack {
    // Read header
    const { samplePack, position: afterHeaderPosition } = readHeader(packedData);
    let position = afterHeaderPosition;

    const presetOffsets = new Array(NUM_PAGES * PRESETS_PER_PAGE);

    // Read presetOffsets
    for (let i = 0; i < NUM_PAGES * PRESETS_PER_PAGE; i++) {
        const lowByte = packedData[position++];
        const highByte = packedData[position++];
        const offset = lowByte | (highByte << 8);
        presetOffsets[i] = offset;
    }

    for (let pageIndex = 0; pageIndex < NUM_PAGES; pageIndex++) {
        const page: Page = [];
        for (let presetIndex = 0; presetIndex < PRESETS_PER_PAGE; presetIndex++) {
            const offsetIndex = pageIndex * PRESETS_PER_PAGE + presetIndex;
            const offset = presetOffsets[offsetIndex];
            if (offset === 0xFFFF) {
                // Loop is null
                page.push(null);
            } else {
                let loopPosition = HEADER_SIZE + offset;
                const { loopData } = readLoop(packedData, loopPosition);
                page.push(loopData);
            }
        }
        samplePack.pages.push(page);
    }

    return samplePack;
}


export function generateDummySamples(): SamplePack {
    // Define note events
    const kick_on: NoteEvent = { note: 36, velocity: 100, state: 1 }; // Kick drum on
    const kick_off: NoteEvent = { note: 36, velocity: 0, state: 0 }; // Kick drum off
    const snare_on: NoteEvent = { note: 38, velocity: 100, state: 1 }; // Snare drum on
    const snare_off: NoteEvent = { note: 38, velocity: 0, state: 0 }; // Snare drum off
    const highhat_on: NoteEvent = { note: 42, velocity: 100, state: 1 }; // Hi-hat on
    const highhat_off: NoteEvent = { note: 42, velocity: 0, state: 0 }; // Hi-hat off

    // Helper function to create events
    function createEvents(eventMap: { [time: number]: NoteEvent[] }): NoteEventTime[] {
        const events: NoteEventTime[] = [];
        for (const timeStr in eventMap) {
            const time = parseInt(timeStr, 10);
            for (const event of eventMap[time]) {
                events.push([time, event]);
            }
        }
        // Sort events by time
        events.sort((a, b) => a[0] - b[0]);
        return events;
    }

    // Define loops
    const loop0: LoopData = {
        length: 48, // Total length of the loop in ticks
        events: createEvents({
            0: [kick_on, highhat_on],
            6: [kick_off, highhat_off],
            12: [highhat_on],
            18: [highhat_off],
            24: [kick_on, snare_on, highhat_on],
            30: [kick_off, snare_off, highhat_off],
            36: [highhat_on],
            42: [highhat_off],
        }),
    };

    const loop1: LoopData = {
        length: 32,
        events: createEvents({
            0: [kick_on],
            12: [snare_on],
            24: [kick_off, snare_off],
        }),
    };

    // Initialize pages
    const pages: Page[] = [];

    // Define the first page with loops
    const page0: Page = new Array(CONFIG_KEYBED_SIZE).fill(null);
    page0[0] = loop0;
    page0[1] = loop1;
    page0[2] = loop1;

    pages.push(page0);

    // Define the remaining pages as empty (no loops)
    for (let i = 1; i < NUM_PAGES; i++) {
        const emptyPage: Page = new Array(CONFIG_KEYBED_SIZE).fill(null);
        pages.push(emptyPage);
    }

    // Create the SamplePack
    const samplePack: SamplePack = {
        id: 0x12345678, // Example ID
        reserved1: 0xFFFFFFFF,
        reserved2: 0xFFFFFFFF,
        reserved3: 0xFFFFFFFF,
        pages: pages,
    };

    return samplePack;
}