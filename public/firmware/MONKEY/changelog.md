# 1.1.94[06. May 2026] -dev
- New UNDO checkpoint when DRM is enabled/disabled
- Reduce risk of muting channel when wanting to change channel

# 1.1.93[05. May 2025] -dev
- New UNDO checkpoint created when changing channels
- Looper UNDO minor fixes
- Fix data transfer speed issue
- Known issue: DRM modifier repeat creating zero-length notes in some cases

# 1.1.92[27. April 2025] -dev
- Minor fixes

# 1.1.91[31. March 2025] -dev
- Minor fixes

# 1.1.9[2. march 2025] The drum update -dev
- User selectable drum loops (through web interface)
- DRM: presets are now banks of drum loops instead of swing amount
- DRM: The black keys are now momentary loop modifiers
- Improved updating Bluetooth connection parameters
- Other minor improvements & fixes

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