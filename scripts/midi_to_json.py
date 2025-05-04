#!/usr/bin/env python3
"""Convert a single .midi file that contains several loops separated by a silence (or rest)
of at least ``GAP_BEATS`` quarter‑notes into a JSON description that can be consumed
by your application.

Usage
-----
$ python midi_to_json.py <midi_file> <id> <name> [gap_beats]

- ``<midi_file>`` – path to the .midi file that holds all the loops
- ``<id>`` – numeric ID to store in the top‑level JSON object
- ``<name>`` – textual name stored in the JSON
- ``[gap_beats]`` – *optional* override of the minimum rest (defaults to ``GAP_BEATS``)

The script writes ``loops.json`` next to the MIDI file and prints a short success
message.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import mido

# ────────────────────────────────────────────────────────────────────────────────
# Tunables
# ────────────────────────────────────────────────────────────────────────────────
TICKS_PER_BEAT: int = 24        # quantise every quarter‑note to 24 ppq
GAP_BEATS: int = 4              # a pause ≥ this many beats marks a new loop
MAX_BEATS: int = 255            # guard for overly long clips (fits 1‑byte length)

# ────────────────────────────────────────────────────────────────────────────────
# Core helpers
# ────────────────────────────────────────────────────────────────────────────────

def _is_note_event(msg: mido.Message) -> bool:
    """True for *note_on*/*note_off* messages (incl. velocity‑0 *note_on*)."""
    return msg.type in ("note_on", "note_off")


def _msg_state(msg: mido.Message) -> int:
    """Return 1 for *note_on* (≠0 velocity) else 0."""
    if msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
        return 0
    return 1


# ────────────────────────────────────────────────────────────────────────────────
# Loop extraction logic
# ────────────────────────────────────────────────────────────────────────────────

def extract_loops(path: Path, gap_beats: int = GAP_BEATS):
    """Return a list of loop dicts from *path*.

    Each loop is delimited by a rest of ≥ *gap_beats* quarter‑notes when quantised
    to ``TICKS_PER_BEAT``. Timing inside a loop is expressed *relative to its own
    start* so that every loop can stand alone.
    """
    midi = mido.MidiFile(path)
    scale = TICKS_PER_BEAT / midi.ticks_per_beat  # normalise to our PPQN

    merged = mido.merge_tracks(midi.tracks)  # flatten tracks preserving order

    abs_tick = 0  # absolute time (source ticks)
    loop_start_tick = 0
    last_tick = 0
    gap_ticks = gap_beats * TICKS_PER_BEAT

    loops: list[dict] = []
    current_events: list[list] = []

    for msg in merged:
        abs_tick += msg.time  # accumulate delta‑times
        if not _is_note_event(msg):
            continue

        scaled_tick = int(round(abs_tick * scale))

        # If the silence between *last* event and *this* exceeds our threshold, we
        # close the current loop (if any) and start a new one.
        if current_events and (scaled_tick - last_tick) >= gap_ticks:
            loops.append(_finalise_loop(current_events, last_tick - loop_start_tick))
            current_events = []
            loop_start_tick = scaled_tick

        rel_tick = scaled_tick - loop_start_tick  # time inside current loop
        event = [rel_tick, {
            "note": msg.note,
            "state": _msg_state(msg),
            "velocity": msg.velocity,
        }]
        current_events.append(event)
        last_tick = scaled_tick

    # Flush the final loop
    if current_events:
        loops.append(_finalise_loop(current_events, last_tick - loop_start_tick))

    assert len(loops) == 15, "must have exactly 15 loops"

    return loops


def _finalise_loop(events, length_ticks):
    """Create loop dict, asserting it fits in a byte."""
    length_beats = math.ceil(length_ticks / TICKS_PER_BEAT)
    assert length_beats <= MAX_BEATS, (
        f"Loop is {length_beats} beats long – exceeds {MAX_BEATS}‑beat limit.")
    return {
        "length_beats": length_beats,
        "events": events,
    }


def main() -> None:
    midi_path = Path("scripts/midi/triphop.mid")
    gap_beats = 4
    
    # Set up output directory
    out_dir = Path("public/samples/MONKEY/DRM")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Load or create samples.json
    samples_json_path = out_dir / "samples.json"
    if samples_json_path.exists():
        samples_data = json.loads(samples_json_path.read_text())
    else:
        samples_data = {}
    
    # Check if sample with same name exists
    sample_name = midi_path.stem
    existing_id = None
    for id, name in samples_data.items():
        if name == sample_name:
            existing_id = int(id)
            break
    
    if existing_id is not None:
        print(f"Sample '{sample_name}' already exists with ID {existing_id}")
        response = input("Do you want to replace it? (y/n): ").lower()
        if response != 'y':
            print("Aborting...")
            return
        sample_id = existing_id
    else:
        # Find first available ID
        existing_ids = set()
        for json_file in out_dir.glob("*.json"):
            if json_file.name != "samples.json":  # Skip samples.json
                try:
                    data = json.loads(json_file.read_text())
                    existing_ids.add(data["id"])
                except (json.JSONDecodeError, KeyError):
                    continue
        
        sample_id = 1
        while sample_id in existing_ids:
            sample_id += 1

    # Extract loops and create payload
    loops = extract_loops(midi_path, gap_beats)
    payload = {
        "id": sample_id,
        "name": sample_name,
        "loops": loops
    }

    # Write the sample file
    out_path = out_dir / f"{sample_id}.json"
    out_path.write_text(json.dumps(payload, indent=2))
    
    # Update samples.json
    samples_data[str(sample_id)] = sample_name
    samples_json_path.write_text(json.dumps(samples_data, indent=2))
    
    print(f"Wrote {len(loops)} loops to {out_path}")
    print(f"Updated samples.json with ID {sample_id}")

if __name__ == "__main__":
    main()