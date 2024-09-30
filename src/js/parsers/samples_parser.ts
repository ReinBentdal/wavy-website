// Define CONFIG_KEYBED_SIZE, which represents the number of presets per page
export const CONFIG_KEYBED_SIZE = 25; // Adjust this value if your keybed size is different
export const TICKS_PER_BEAT = 24; // 24 ticks per beat

// Define event type
export interface NoteEvent {
    note: number; // int8_t
    state: number;
    velocity: number; 
}

// Define loop data structure
interface LoopData {
    [timeTickStr: string]: NoteEvent[];
}

// Helper functions to write data in little-endian format
function writeInt8(array: number[], value: number): void {
    array.push(value & 0xFF);
}

function writeUint8(array: number[], value: number): void {
    array.push(value & 0xFF);
}

// little endian
function writeUint16LE(array: number[], value: number): void {
    array.push(value & 0xFF);
    array.push((value >> 8) & 0xFF);
}

// Define the event structure for the drum sequence
interface SampleEvent {
    note: number;
    data: number;
    timeTicks: number;
}

// Function to build loop data
function buildLoopData(loop: LoopData) {
    const events: SampleEvent[] = [];
    let loopLength = 0;

    for (const timeTickStr in loop) {
        const timeTick = parseInt(timeTickStr, 10);
        if (timeTick > loopLength) {
            loopLength = timeTick;
        }
        const noteEvents = loop[timeTickStr];
        for (const noteEvent of noteEvents) {
            // Create _drum_event
            const note = noteEvent.note; // int8_t
            const state = noteEvent.state & 0x01; // Ensure state is 0 or 1
            const velocity = noteEvent.velocity & 0x7F; // Ensure velocity is 0-127
            const data = (state << 7) | velocity; // uint8_t
            const timeTicks = timeTick; // uint16_t
            events.push({
                note: note,
                data: data,
                timeTicks: timeTicks,
            });
        }
    }

    // loop length to closest beat (24)
    loopLength = Math.ceil(loopLength / TICKS_PER_BEAT);

    const numEvents = events.length;

    return {
        events: events,
        numEvents: numEvents,
        loopLength: loopLength,
    };
}

// Define the type for pages, each page is an array of loops
export type Page = (LoopData | null)[];

export type Samples = Page[];

// Main function to build the byte array from pages
export function samplesParser_encode(pages: Samples): Uint8Array {
    const NUM_PAGES = 10;
    const PRESETS_PER_PAGE = CONFIG_KEYBED_SIZE;
    const HEADER_SIZE = NUM_PAGES * PRESETS_PER_PAGE * 2; // 2 bytes per offset

    const byteArray: number[] = []; // Final byte array
    const presetOffsets = new Array(NUM_PAGES * PRESETS_PER_PAGE).fill(0); // Initialize preset offsets
    let currentOffset = HEADER_SIZE; // Start after the header

    // Reserve space for the header
    for (let i = 0; i < HEADER_SIZE; i++) {
        byteArray.push(0);
    }

    for (let pageIndex = 0; pageIndex < NUM_PAGES; pageIndex++) {
        const page = pages[pageIndex] || [];
        for (let presetIndex = 0; presetIndex < PRESETS_PER_PAGE; presetIndex++) {
            const loop = page[presetIndex];
            if (loop !== null && loop !== undefined) {
                // Build loop data
                const loopData = buildLoopData(loop);
                const { events, numEvents, loopLength } = loopData;

                // Record the offset relative to the end of the header
                const offsetRelativeToHeader = currentOffset - HEADER_SIZE;

                // Update the preset offset (1-indexed)
                presetOffsets[pageIndex * PRESETS_PER_PAGE + presetIndex] = offsetRelativeToHeader + 1;

                // Build _drum_sequence struct
                // loop_length (uint16_t)
                writeUint8(byteArray, loopLength);
                // num_events (uint8_t)
                writeUint8(byteArray, numEvents);

                // Build events data
                for (const event of events) {
                    // note (int8_t)
                    writeInt8(byteArray, event.note);
                    // data (uint8_t)
                    writeUint8(byteArray, event.data);
                    // time_ticks (uint16_t)
                    writeUint16LE(byteArray, event.timeTicks);
                }

                // Update currentOffset
                const sequenceSize = 1 + 1; // num_events (1 byte) + loop_length (1 byte)
                const eventsSize = numEvents * 4; // Each event is 4 bytes (int8_t + uint8_t + uint16_t)
                currentOffset += sequenceSize + eventsSize;
            }
        }
    }

    // Write presetOffsets back into byteArray at positions 0 to HEADER_SIZE - 1
    let headerIndex = 0;
    for (let i = 0; i < presetOffsets.length; i++) {
        const offsetValue = presetOffsets[i];
        byteArray[headerIndex++] = offsetValue & 0xFF;
        byteArray[headerIndex++] = (offsetValue >> 8) & 0xFF;
    }

    return Uint8Array.from(byteArray);
}

// Helper function to read int8 from a byte (0-255)
function readInt8(value: number): number {
    if (value >= 0x80) {
        return value - 0x100;
    } else {
        return value;
    }
}

// Helper function to read uint16_t in little-endian format
function readUint16LE(array: Uint8Array, index: number): number {
    return array[index] | (array[index + 1] << 8);
}

// Main decoder function
export function samplesParser_decode(packedData: Uint8Array): Samples {
    const NUM_PAGES = 10;
    const PRESETS_PER_PAGE = CONFIG_KEYBED_SIZE;
    const HEADER_SIZE = NUM_PAGES * PRESETS_PER_PAGE * 2; // 2 bytes per offset

    const presetOffsets = new Array(NUM_PAGES * PRESETS_PER_PAGE).fill(0);

    // Read presetOffsets from the header
    for (let i = 0; i < NUM_PAGES * PRESETS_PER_PAGE; i++) {
        const lowByte = packedData[2 * i];
        const highByte = packedData[2 * i + 1];
        const offset = lowByte | (highByte << 8);
        presetOffsets[i] = offset;
    }

    const samples: Samples = [];

    let offsetIndex = 0; // Index in presetOffsets

    for (let pageIndex = 0; pageIndex < NUM_PAGES; pageIndex++) {
        const page: Page = [];
        for (let presetIndex = 0; presetIndex < PRESETS_PER_PAGE; presetIndex++) {
            const offset = presetOffsets[offsetIndex++];
            if (offset === 0) {
                // Loop is null
                page.push(null);
            } else {
                // Adjust offset (subtract 1)
                const offsetRelativeToHeader = offset - 1;
                let position = HEADER_SIZE + offsetRelativeToHeader;

                // Read loop_length and num_events
                const loopLength = packedData[position++];
                const numEvents = packedData[position++];

                const events = [];

                for (let eventIndex = 0; eventIndex < numEvents; eventIndex++) {
                    // Read note (int8_t)
                    const noteByte = packedData[position++];
                    const note = readInt8(noteByte);

                    // Read data (uint8_t)
                    const data = packedData[position++];
                    const state = (data >> 7) & 0x01;
                    const velocity = data & 0x7F;

                    // Read time_ticks (uint16_t) little-endian
                    const timeTicks = readUint16LE(packedData, position);
                    position += 2;

                    events.push({
                        note: note,
                        state: state,
                        velocity: velocity,
                        timeTicks: timeTicks,
                    });
                }

                // Reconstruct LoopData
                const loopData: LoopData = {};

                for (const event of events) {
                    const timeTickStr = event.timeTicks.toString();
                    if (!loopData[timeTickStr]) {
                        loopData[timeTickStr] = [];
                    }
                    loopData[timeTickStr].push({
                        note: event.note,
                        state: event.state,
                        velocity: event.velocity,
                    });
                }

                page.push(loopData);
            }
        }
        samples.push(page);
    }

    return samples;
}