// midi_to_json.js – Node/ESM implementation
// -----------------------------------------------------------------------------
// Convert a multi‑loop MIDI file into per‑loop JSON, mirroring the Python script.
// Requires: npm install @tonejs/midi

import fs from 'fs';
import { Midi } from '@tonejs/midi'; // ([npmjs.com](https://www.npmjs.com/package/%40tonejs/midi?utm_source=chatgpt.com))
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────
// Tunables
// ──────────────────────────────────────────────────────────────────
export const TICKS_PER_BEAT = 24; // quantise to 24 ppq
export const GAP_BEATS       = 4;  // ≥ 4 beats of silence → new loop
export const MAX_BEATS       = 255; // one‑byte length guard

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
const isNote = (e) => e.type === 'noteOn' || e.type === 'noteOff';
const state  = (e) => (e.type === 'noteOff' || (e.type === 'noteOn' && e.velocity === 0)) ? 0 : 1; // ([github.com](https://github.com/Tonejs/Midi/issues/174?utm_source=chatgpt.com))

function finalise(events, lenTicks) {
  const lenBeats = Math.ceil(lenTicks / TICKS_PER_BEAT);
  if (lenBeats > MAX_BEATS) throw new Error(`Loop > ${MAX_BEATS} beats`);
  return { length_beats: lenBeats, events };
}

export function extractLoops(midi, gapBeats = GAP_BEATS) {
  const scale    = TICKS_PER_BEAT / midi.header.ppq;           // ([github.com](https://github.com/Tonejs/Midi/issues/161?utm_source=chatgpt.com))
  const gapTicks = gapBeats * TICKS_PER_BEAT;

  // flatten & time‑stamp events ----------------------------------
  const notes = [];
  midi.tracks.forEach(tr => {
    let abs = 0;
    tr.events.forEach(ev => {
      abs += ev.deltaTicks;
      if (isNote(ev)) notes.push({ ...ev, abs });
    });
  });
  notes.sort((a, b) => a.abs - b.abs);

  // split into loops --------------------------------------------
  const loops = [];
  let cur = [], loopStart = 0, last = 0;
  for (const ev of notes) {
    const tick = Math.round(ev.abs * scale);
    if (cur.length && tick - last >= gapTicks) {
      loops.push(finalise(cur, last - loopStart));
      cur = []; loopStart = tick;
    }
    cur.push([tick - loopStart, { note: ev.noteNumber, state: state(ev), velocity: Math.round(ev.velocity * 127) }]);
    last = tick;
  }
  if (cur.length) loops.push(finalise(cur, last - loopStart));
  return loops;
}

export async function buildSample({ midiPath, outDir = 'public/samples/MONKEY/DRM', gapBeats = GAP_BEATS }) {
  const midi  = new Midi(fs.readFileSync(midiPath)); // parse buffer
  const loops = extractLoops(midi, gapBeats);

  fs.mkdirSync(outDir, { recursive: true }); // ([nodejs.org](https://nodejs.org/en/learn/manipulating-files/working-with-folders-in-nodejs?utm_source=chatgpt.com))
  const samplesPath = path.join(outDir, 'samples.json');
  const samples     = fs.existsSync(samplesPath) ? JSON.parse(fs.readFileSync(samplesPath)) : {};

  const name      = path.parse(midiPath).name;
  let   id        = +Object.keys(samples).find(k => samples[k] === name) || null;
  if (!id) {
    const used = new Set(fs.readdirSync(outDir)
      .filter(f => f.endsWith('.json') && f !== 'samples.json')
      .map(f => JSON.parse(fs.readFileSync(path.join(outDir, f))).id));
    id = 1; while (used.has(id)) id++;
  }

  const payload = { id, name, loops };
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(payload, null, 2)); // ([developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify?utm_source=chatgpt.com))
  samples[id] = name; fs.writeFileSync(samplesPath, JSON.stringify(samples, null, 2));
  console.log(`Wrote ${loops.length} loops to ${id}.json`);
}

// CLI -----------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {        // ([nodejs.org](https://nodejs.org/docs/latest/api/process.html?utm_source=chatgpt.com))
  const [, , midi, gap] = process.argv;
  console.log("starting");
  if (!midi) {
    console.error('Usage: node midi_to_json.js <file.mid> [gap_beats]');
    process.exit(1);
  }
  buildSample({ midiPath: midi, gapBeats: Number(gap) || GAP_BEATS }).catch(err => { console.error(err); process.exit(1); });
}
