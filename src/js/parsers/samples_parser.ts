// Define constants
export const TICKS_PER_BEAT = 24; // 24 ticks per beat
export const NUM_PAGES = 10;
export const LOOPS_PER_PAGE = 15;

class ByteArray {
    data: number[];

    constructor() {
        this.data = [];
    }

    push8(value: number): void {
        if (value < 0 || value > 0xFF) {
            throw new RangeError(`Value ${value} is out of range for an 8-bit unsigned integer`);
        }
        this.data.push(value & 0xFF);
    }

    push16(value: number): void {
        if (value < 0 || value > 0xFFFF) {
            throw new RangeError(`Value ${value} is out of range for a 16-bit unsigned integer`);
        }
        this.data.push(value & 0xFF);
        this.data.push((value >> 8) & 0xFF);
    }

    push32(value: number): void {
        if (value < 0 || value > 0xFFFFFFFF) {
            throw new RangeError(`Value ${value} is out of range for a 32-bit unsigned integer`);
        }
        this.data.push(value & 0xFF);
        this.data.push((value >> 8) & 0xFF);
        this.data.push((value >> 16) & 0xFF);
        this.data.push((value >> 24) & 0xFF);
    }

    pop8(): number {
        if (this.data.length < 1) {
            throw new RangeError("Attempted to pop from an empty array");
        }
        return this.data.shift()!;
    }

    pop16(): number {
        if (this.data.length < 2) {
            throw new RangeError("Not enough data to pop 16 bits");
        }
        const lsb = this.data.shift()!;
        const msb = this.data.shift()!;
        return lsb | (msb << 8);
    }

    pop32(): number {
        if (this.data.length < 4) {
            throw new RangeError("Not enough data to pop 32 bits");
        }
        const b0 = this.data.shift()!;
        const b1 = this.data.shift()!;
        const b2 = this.data.shift()!;
        const b3 = this.data.shift()!;
        let value = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
        return value >>> 0; // force unsigned interpretation
    }

    add(other: ByteArray): void {
        this.data.push(...other.data);
    }

    static from(array: Uint8Array): ByteArray {
        const byteArray = new ByteArray();
        byteArray.data = Array.from(array); // Convert Uint8Array to a regular array
        return byteArray;
    }
}

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
    length_beats: number;
    events: NoteEventTime[];
}

// Define the type for pages, each page is an array of loops
export interface Page {
    id: number // uint16_t
    name?: string
    loops: LoopData[]
}

// Define the sample pack type
export interface SamplePack {
    // storage metadata
    reserved0?: number; // uint32_t
    reserved1?: number; // uint32_t
    reserved2?: number; // uint32_t
    reserved3?: number; // uint32_t

    // Pack content
    pages: Page[];
}

export function samplesParser_encode(samplePack: SamplePack): Uint8Array {
    let d = new ByteArray()

    // write header
    d.push32(samplePack.reserved0)
    d.push32(samplePack.reserved1)
    d.push32(samplePack.reserved2)
    d.push32(samplePack.reserved3)

    for (let i = 0; i < NUM_PAGES; i++) {
        d.push16(samplePack.pages[i].id)
    }

    // gather offsets and loop data, then combine into main array
    let loopOffsets = new ByteArray()
    let loopData = new ByteArray()
    for (let page_idx = 0; page_idx < NUM_PAGES; page_idx++) {
        let page = samplePack.pages[page_idx]
        for (let loop_idx = 0; loop_idx < LOOPS_PER_PAGE; loop_idx++) {
            let loop = page.loops[loop_idx]
            if (loop == null) {
                loopOffsets.push16(0xFFFF)
                continue
            }
            loopOffsets.push16(loopData.data.length) // offset relative to start of data

            loopData.push8(loop.length_beats) // loop length
            loopData.push8(loop.events.length) // number of events
            for (const event of loop.events) {
                const [ticks, noteEvent] = event;
                loopData.push8(noteEvent.note & 0x7F)
                const data = (noteEvent.state << 7) | (noteEvent.velocity & 0x7F);
                loopData.push8(data);
                loopData.push16(ticks);
            }
        }
    }

    d.add(loopOffsets)
    d.add(loopData)

    return Uint8Array.from(d.data)
}

export function samplesParser_decode(packedData: Uint8Array): SamplePack {
    let d = ByteArray.from(packedData)
    let p: SamplePack = {
        reserved0: d.pop32(),
        reserved1: d.pop32(),
        reserved2: d.pop32(),
        reserved3: d.pop32(),
        pages: [],
    }

    // extract page IDs
    for (let i = 0; i < NUM_PAGES; i++) {
        p.pages.push({ id: d.pop16(), loops: [] })
    }

    // remove offsets, only interested in loop is set or not
    let loopExists: boolean[] = []
    for (let i = 0; i < NUM_PAGES * LOOPS_PER_PAGE; i++) {
        loopExists.push(d.pop16() === 0xFFFF ? false : true)
    }

    for (let page_idx = 0; page_idx < NUM_PAGES; page_idx++) {
        let page = p.pages[page_idx]
        for (let loop_idx = 0; loop_idx < LOOPS_PER_PAGE; loop_idx++) {

            if (loopExists[page_idx * NUM_PAGES + loop_idx] == false) {
                page.loops.push(null)
                continue
            }

            let loop: LoopData = {
                length_beats: d.pop8(),
                events: []
            }
            let numEvents = d.pop8()
            for (let i = 0; i < numEvents; i++) {
                let note = d.pop8() & 0x7F
                let data = d.pop8()
                let state = (data >> 7) & 0x01;
                let velocity = data & 0x7F;
                let ticks = d.pop16()
                loop.events.push([ticks, { note: note, state: state, velocity: velocity }])
            }
            page.loops.push(loop)
        }
    }

    return p
}

export function getPageByteSize(page: Page): number {
    let size = 0;
    page.loops.forEach((loop) => {
        if (loop == null) return;
        size += 1; // add for loop length
        size += 1; // add for number of events (max255)
        loop?.events?.forEach((_) => {
            size += 4 // each note is 4 bytes
        })
    })
    return size;
}

export function getPackSize(pack: SamplePack): number {
    let size = 0;
    // dont include reserved as its part of the fixed data
    pack.pages.forEach((page) => size += getPageByteSize(page))
    return size;
}
