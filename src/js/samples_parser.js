// Define CONFIG_KEYBED_SIZE, which represents the number of presets per page
export const CONFIG_KEYBED_SIZE = 25; // Adjust this value if your keybed size is different

// Helper functions to write data in little-endian format
function writeInt8(array, value) {
  array.push(value & 0xFF);
}

function writeUint8(array, value) {
  array.push(value & 0xFF);
}

function writeUint16LE(array, value) {
  array.push(value & 0xFF);
  array.push((value >> 8) & 0xFF);
}

// Function to build loop data
function buildLoopData(loop) {
  const events = [];
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

  loopLength += 1; // Adjust loop length if necessary

  const numEvents = events.length;

  return {
    events: events,
    numEvents: numEvents,
    loopLength: loopLength,
  };
}

// Main function to build the byte array from pages
export function samplesParse(pages) {
  const NUM_PAGES = 10;
  const PRESETS_PER_PAGE = CONFIG_KEYBED_SIZE;
  const HEADER_SIZE = NUM_PAGES * PRESETS_PER_PAGE * 2; // 2 bytes per offset

  const byteArray = []; // Final byte array
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
        writeUint16LE(byteArray, loopLength);
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
        const sequenceSize = 1 + 2; // num_events (1 byte) + loop_length (2 bytes)
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