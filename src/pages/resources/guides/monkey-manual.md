---
layout: ../../../layouts/ManualLayout.astro
title: MONKEY manual - Wavy Industries
---

# MON**KEY** Manual
MON**KEY** is an ultra portable and versatile 2-octave Bluetooth MIDI keyboard.

## Hardware overview
MON**KEY** features a 2-octave keybed starting on the F-key. Play it as a typical MIDI keyboard, or access its extended capabilities thorugh the SHIFT key. While SHIFT is pressed down, you will get access to the labeled functions.

![monkey 2d function](/assets/resources/monkey_manual/monkey_2d_functions.svg)

MON**KEY** gives feedback to the user through its LEDs. The light tower LED will give general feedback from function manipulations. The monkey LEDs will give feedback related to the loop recorder functionality.

The lock switch is used to disable the keybed. Note, it does not turn off the unit, but it prevents unwanted key presses. You do not need to turn off MON**KEY**. It will go to sleep by itself.

Communication is only through Bluetooth.

Insert a CR2032 battery to get doing.

## Getting started
To get started, we refer to the [getting started](/monkey/getting-started) guide. We recommend to have MON**KEY** powered up and connected to a host while going through the rest of the manual.

## Functions overview
The functions are devided into a few sections. The functions highlighted with a white circle are the MIDI effects, going from ARP to DRM. The functions to the left of these effects are general configurations and to the right we have the loop recorder + WAKE.

The first function you should get familiar with is the **WAKE** key. Pressing **SHIFT**+**WAKE** will reset the device and pressing **SHIFT** + **long pressing WAKE** will reboot the device. MON**KEY** have a workflow which you might not be familiar with. If you ever get lost, **WAKE** is by your side!

Starting from the left we have **OCT-** and **OCT+**. These are the most straight forward functions as they only change the octave range of the keybed.

<!-- *gif of changing OCT* -->

Furthermore we have the **BPM** function which lets you set the global BPM. Do so by pressing SHIFT+BPM. Keep the SHIFT key pressed followed by typing in the BPM you want using the keys labeled with numbers. Notice the feedback you get from the light tower LED.

<!-- *gif of changing BPM* -->

Change the MIDI channel using the **CH** function. Similarly to **BPM**, press SHIFT+CH. THen release CH followed by selecting one of the labeled number keys corresponding to the channel you would like to select. Selecting 0 will select MIDI channel 10. Notice the feedback you get from the light tower LED.
**CAUTION**: **SHIFT** + **long pressing CH** is another function which will be described later.

<!-- *gif of changing MIDI CH* -->

Toggle on and off note hold using the **HOLD** function. Notice the light house LED blinking once if the function was enabled and twice if it was disabled.

<!-- *gif turning on and off hold* -->

Now we have the MIDI effects. Each one of them will be described more in detail further down. Similarly to **HOLD** they are toggled. And only one effect might be enabled at once. Once a effect is enabled you can change between its presets. Do this på pressing **SHIFT**+**one of the numbered keys**.

The loop recorder will be described in more detail later.

## MIDI effects
*info coming*

## Loop recorder
The loop recorder is controlled using the PLAY, REC, and UNDO keys. It is fixed with a length of 16 beats. By pressing the REC key the looper becomes armed to record. The monkey eyes will light up. Then when you start playing on the keys, the looper will automatically start the looper. Blinking monkey eyes indicate the looper is playing. While the looper is playing, you may turn on or off recording by pressing the REC key. The monkey LED will indicate wether it’s recording or not. Use the PLAY key to turn on and off loop playback.  Press the UNDO key to undo your last recording. Each time you stop the recording, an UNDO checkpoint is created. To remove all recordings from a specific MIDI channel, long press the UNDO key, then press the number key corresponding to the desired MIDI channel.