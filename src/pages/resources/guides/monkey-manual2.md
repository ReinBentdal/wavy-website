---
layout: ../../../layouts/ManualLayout.astro
title: MONKEY manual - Wavy Industries
---

# MON**KEY** manual

***Manual is a work in progress.***

We recommend gradually exploring Monkey's concepts through hands-on testing to familiarize yourself with the workflow. When you see the symbol (☛), we recommend checking out what was described.

## Getting Started

To begin, insert a CR2032 battery into the battery compartment. Monkey will immediately boot and become connectable via Bluetooth. For detailed connection instructions, [check out the getting started guide]({routes["monkey-getting-started"]}). To the right of the keys, there is a lock switch. This disables the keybed to prevent unwanted keypresses. Make sure it is in the unlocked position before continuing.

## Basic Operations

Once connected, Monkey is immediately usable as a basic MIDI keyboard. However, this only scratches the surface of its abilities. Monkey has a keybed spanning two octaves, starting from the F key (☛). Each key is labeled: the upper keys are each assigned a number while the lower keys have a function designated to it. To access any of these functions, hold down the SHIFT button while pressing the corresponding key. For example, to change octaves, hold SHIFT and press OCT- or OCT+ (☛). WAKE is to your rescue if you ever get lost. Press WAKE to reset the device back to its initial state. Long pressing WAKE will reboot the device. Rebooting might be useful if you are having problems connecting to Monkey or want to disconnect.

Monkey has six MIDI effects, which are the functions highlighted with a white circle. ARP is probably the most recognizable one (☛). This is a good time to introduce the lighthouse LED. It will help you understand what’s going on. For example, when enabling a MIDI effect, the lighthouse LED will blink once. If you try to enable the same effect once again, the lighthouse will blink twice which means the effect was disabled (☛). Each effect has ten presets. Change the active preset by holding SHIFT and pressing a numbered key. Congrats! Now you know the basics of Monkey! This is a good time to play around with these effects (except DRM), as well as their presets, and try to figure out what each of them does.

DRM is a special MIDI effect that plays different drum loops. It always sends on MIDI channel 10. To change the global MIDI channel, press the CH key followed by the number key for your desired MIDI channel (☛). Be aware, long pressing the CH key serves another purpose: muting individual channels. Configure your DAW to have instruments on different MIDI channels and assign a drum rack to MIDI channel 10 (☛).

There are two remaining keys to the left of the MIDI effects which are not yet discussed: Change the BPM by pressing the BPM key and then typing the desired BPM value using the number keys. The HOLD key toggles on and off note hold (☛).

## Loop Recorder

The loop recorder is controlled using the PLAY, REC, and UNDO keys. It is fixed with a length of 16 beats. By pressing the REC key the looper becomes armed to record. The monkey eyes will light up. Then when you start playing on the keys, the looper will automatically start the looper. Blinking monkey eyes indicate the looper is playing. While the looper is playing, you may turn on or off recording by pressing the REC key. The monkey LED will indicate whether it’s recording or not (☛). Use the PLAY key to turn on and off loop playback. Press the UNDO key to undo your last recording. Each time you stop the recording, an UNDO checkpoint is created. To remove all recordings from a specific MIDI channel, long press the UNDO key, then press the number key corresponding to the desired MIDI channel.

## Device Recover
Needing to recover the device should be extremely unlikely. First make sure this is actually the case. But if you think it is the case, we would recommend you to contact us either by email or discord to troubleshoot the issue.

MON**KEY** keeps a backup of the previous update in case the current one is faulty, and gives you the option to revert back to it. Do not try to revert back if the fault is not likely to be caused by a new update. To revert back to the previous update, reboot MONKEY by pressing SHIFT + long press WAKE. As soon as you see the LED in the light tower light up, switch over to holding down SHIFT + UNDO and keep them pressed during boot. You should notice the LEDs not blinking, indicating it did not boot and instead entered rollback mode. Please wait for it to complete this task and it should boot into this older update. 