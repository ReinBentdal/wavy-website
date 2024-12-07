# 1.1.3[10. nov 2024]
- Fix looper edge case where two undo checkpoints might merge when using channel undo

# 1.1.2[09. nov 2024]
- Improved battery percentage algorithm
- Tweaked modulation touch surface sensitivity
- Fixed modulation touch surface preventing device from going to sleep

# 1.1.1[04. nov 2024]
- Fix beta hardware support

# 1.1.0[29. oct 2024] Touch Modulation
This release branch introduced the CC Touch modulation surface
- MIDI CC Modulation throught the touch surface underneath the monkey playing the piano
- SHIFT long press to see connection status. Double blink means connected. Single blink means not connected. When in this mode, press WAKE to disconnect from host.
- Other minor improvements

# 1.0.3[26. oct 2024] -dev
- Capacitive touch improved user fidelity
- SHIFT Long press increased to 2 seconds
- SHIFT 'ultra long press' to get connection status. Then press WAKE to disconnect from host.

# 1.0.2[10. oct 2024] -dev
- Capacitive touch improved sensitivity & stability
- Capacitive touch improved power consuimption

# 1.0.1[2. oct 2024] -dev
- Initial capacitive touch modulation support

# 1.0.0[28. aug 2024] Official MONKEY release
- Support for production hardware
- Updated STTR presets
- Lots of minor improvements

# 0.9.0 Production release candidate -obsolete
- Support for new hardware
- Updated STTR presets
- Lots of minor improvements

# 0.6.7 -obsolete
- Minor power management improvements
- Input handling improvements
- Drum preset algorithm testing

# 0.6.5 -obsolete
- Power management improvements. Bluetooth will now turn off after 15 minutes of inactivity. Reactivate by pressing any key

# 0.6.4 -obsolete
- Mute/unmute multiple channels from looper when longpress SHIFT+CH
- Looper now starts from the beginning each time it starts playing
- Fix: not all notes are released on device reset