import mido
import os
import math
import sys

# Define the standard ticks per beat for output
TICKS_PER_BEAT = 24  # You can adjust this value as needed

def process_midi_file(path):
    midi_file = mido.MidiFile(path)
    file_ticks_per_beat = midi_file.ticks_per_beat  # Original ticks per beat in the MIDI file
    accumulated_ticks = 0
    events = []
    max_scaled_tick = 0

    # Calculate the scale factor to normalize ticks
    scale_factor = TICKS_PER_BEAT / file_ticks_per_beat

    # Collect all note events with absolute scaled tick times
    for track in midi_file.tracks:
        accumulated_ticks = 0  # Reset accumulated_ticks for each track if needed
        for msg in track:
            accumulated_ticks += msg.time
            if msg.type in ['note_on', 'note_off']:
                # Scale the accumulated ticks to the standard TICKS_PER_BEAT
                scaled_tick = int(round(accumulated_ticks * scale_factor))
                note = msg.note
                velocity = msg.velocity
                if msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                    state = 0
                else:
                    state = 1
                note_event = {
                    'note': note,
                    'state': state,
                    'velocity': velocity
                }
                event_time = [scaled_tick, note_event]
                events.append(event_time)
                max_scaled_tick = max(max_scaled_tick, scaled_tick)
    
    # Calculate length_beats as integer number of beats, rounded up
    total_beats = math.ceil(max_scaled_tick / TICKS_PER_BEAT)
    length_beats = total_beats

    assert length_beats <= 255, f"beat length is longer than what the system can store {length_beats}"

    # Create LoopData object
    loop_data = {
        'length_beats': length_beats,
        'events': events
    }
    return loop_data

def loop_data_to_js(loop_data):
    length_beats = loop_data['length_beats']
    events = loop_data['events']
    # Generate events array
    events_str_list = []
    for event_time in events:
        time = event_time[0]  # Scaled time in ticks (integer)
        note_event = event_time[1]
        note = note_event['note']
        state = note_event['state']
        velocity = note_event['velocity']
        event_str = f'[{time}, {{ note: {note}, state: {state}, velocity: {velocity} }}]'
        events_str_list.append(event_str)
    events_str = '[\n    ' + ',\n    '.join(events_str_list) + '\n  ]'
    loop_data_str = f'{{\n  length_beats: {length_beats},\n  events: {events_str}\n}}'
    return loop_data_str

def process_midi_files_in_directory(directory):
    loop_data_list = []
    for filename in sorted(os.listdir(directory)):
        if filename.endswith('.mid') or filename.endswith('.midi'):
            path = os.path.join(directory, filename)
            loop_data = process_midi_file(path)
            loop_data_list.append(loop_data)
    return loop_data_list

def generate_js_code(loop_data_list):
    loop_data_str_list = [loop_data_to_js(loop_data) for loop_data in loop_data_list]
    loops_array_str = '[\n' + ',\n'.join(loop_data_str_list) + '\n]'
    js_code = 'export const loops: LoopData[] = ' + loops_array_str + ';'
    return js_code

def main():
    if len(sys.argv) != 2:
        print("Usage: python midi_to_obj.py <relative_directory>")
        sys.exit(1)

    directory = sys.argv[1]
    loop_data_list = process_midi_files_in_directory(directory)
    js_code = generate_js_code(loop_data_list)

    # Optionally, write the JS code to a file
    with open('loops.js', 'w') as f:
        f.write(js_code)

    # print(js_code)
    print(f"successfully created pack with length {len(loop_data_list)}")

if __name__ == '__main__':
    main()
