// midi_to_json.browser.js — Pure‑browser ES‑module
// -----------------------------------------------------------------------------
// Convert a multi‑loop MIDI file (ArrayBuffer or File) into JSON describing the
// loops, using only browser APIs. No Node fs/path dependencies.
// Requires Tone’s parser:
//     <script type="importmap">{ "imports": { "@tonejs/midi": "https://unpkg.com/@tonejs/midi?module" } }</script>
// or install locally and let Vite handle the bundle.

import { Midi } from '@tonejs/midi';

// ──────────────────────────────────────────────────────────────────
// Tunables — tweak for your app
// ──────────────────────────────────────────────────────────────────
export const TICKS_PER_BEAT = 24;   // quantise to 24 ppq
export const GAP_BEATS      = 4;    // ≥ 4 beats of silence → new loop
export const MAX_BEATS      = 255;  // one‑byte length guard

// ──────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────
const isNote = (e) => e.type === 'noteOn' || e.type === 'noteOff';
const state  = (e) => (e.type === 'noteOff' || (e.type === 'noteOn' && e.velocity === 0)) ? 0 : 1;

function finalise(events, lenTicks) {
  const lenBeats = Math.ceil(lenTicks / TICKS_PER_BEAT);
  if (lenBeats > MAX_BEATS) throw new Error(`Loop exceeds ${MAX_BEATS} beats`);
  return { length_beats: lenBeats, events };
}

export function extractLoops(midi, gapBeats = GAP_BEATS) {
  const scale    = TICKS_PER_BEAT / midi.header.ppq;
  const gapTicks = gapBeats * TICKS_PER_BEAT;

  // Flatten all tracks into a single, time‑ordered note event list
  const notes = [];
  midi.tracks.forEach(track => {
    let abs = 0;
    track.events.forEach(ev => {
      abs += ev.deltaTicks;
      if (isNote(ev)) notes.push({ ...ev, abs });
    });
  });
  notes.sort((a, b) => a.abs - b.abs);

  // Slice into loops delimited by ≥ gapTicks of silence
  const loops = [];
  let cur = [], loopStart = 0, last = 0;
  for (const ev of notes) {
    const tick = Math.round(ev.abs * scale);
    if (cur.length && tick - last >= gapTicks) {
      loops.push(finalise(cur, last - loopStart));
      cur = [];
      loopStart = tick;
    }
    cur.push([
      tick - loopStart,
      { note: ev.noteNumber, state: state(ev), velocity: Math.round(ev.velocity * 127) }
    ]);
    last = tick;
  }
  if (cur.length) loops.push(finalise(cur, last - loopStart));
  return loops;
}

// ──────────────────────────────────────────────────────────────────
// Browser‑friendly convenience wrappers
// ──────────────────────────────────────────────────────────────────

/**
 * Convert an ArrayBuffer of MIDI data into the loops JSON structure.
 */
export async function convertMidiArrayBuffer(buffer, { gapBeats = GAP_BEATS } = {}) {
  const midi = new Midi(buffer);
  return extractLoops(midi, gapBeats);
}

/**
 * Convert a File (from <input type="file"> or drag‑and‑drop) into
 * `{ id, name, loops }`. `id` defaults to 1 unless overridden. ✨
 */
export async function convertMidiFile(file, { gapBeats = GAP_BEATS, id = 1 } = {}) {
  const buf   = await file.arrayBuffer();
  const midi  = new Midi(buf);
  const loops = extractLoops(midi, gapBeats);
  return {
    id,
    name: file.name.replace(/\.mid(i)?$/i, ''),
    loops,
  };
}

/**
 * Offer a JSON payload for download as <name>.json.
 */
export function downloadJSON(data, fileName = 'loops.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────────────
// Example usage (vanilla JS)
// ──────────────────────────────────────────────────────────────────
// <input id="midi" type="file" accept=".mid,.midi" />
// <pre id="out"></pre>
// <script type="module">
//   import { convertMidiFile, downloadJSON } from './midi_to_json.browser.js';
//   const input  = document.getElementById('midi');
//   const output = document.getElementById('out');
//   input.addEventListener('change', async (e) => {
//     const file  = e.target.files[0];
//     if (!file) return;
//     const json  = await convertMidiFile(file);
//     output.textContent = JSON.stringify(json, null, 2);
//     downloadJSON(json, `${json.name}.json`);
//   });
// </script>
