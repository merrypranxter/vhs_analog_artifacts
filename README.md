# vhs_analog_artifacts

A creative coding project exploring **VHS and analog television signal artifacts** — the unintentional beauty of degraded video signals: tracking errors, chromatic noise, dropouts, chrominance bleeding, and the particular warmth of magnetic tape as a medium that forgets gracefully.

## What Are Analog Artifacts?

Before digital video, images traveled as continuously varying voltages through cables, modulated onto carrier waves, and were pressed into magnetic oxide particles. Every stage introduced characteristic degradations that became part of the visual language of a generation:

- **Composite video**: Luma (brightness) and chroma (color) share a signal, causing interference
- **NTSC/PAL encoding**: color subcarrier at 3.58 MHz (NTSC) or 4.43 MHz (PAL)
- **VHS tape**: 240-line effective resolution, 1.5 MHz bandwidth, helical scan
- **Tracking**: alignment of rotating head drum with tape tracks
- **Dropout**: missing oxide particles = white noise spikes
- **Chroma noise**: phase instability = color bleeding, dot crawl
- **Head switching**: visible line at bottom of frame from head changeover

## Project Structure

```
shaders/              # GLSL fragment shaders — real-time artifact generation
signal_pipeline/      # Encoding stages: RGB → YUV → composite → RF → VHS
degradation_models/   # Tape wear, generation loss, duplication error accumulation
hardware_variants/    # NTSC, PAL, SECAM; Betamax, VHS, S-VHS, U-matic
playback_states/      # Normal, pause, rewind, fast-forward, tracking error
chromatic_modes/      # Chrominance-specific: color bleeding, hue errors, saturation collapse
luminance_modes/      # Luma-specific: noise, blooming, edge enhancement, smear
temporal_effects/     # Time-base error, frame jitter, field misalignment
aesthetic_renders/    # Deliberately beautiful compositions from artifact stacks
```

## Running

Shaders are written for WebGL/Three.js. Each shader is self-contained — drop it into any fragment shader environment (Shadertoy, The Book of Shaders editor, local Three.js setup). Some effects require video input for authentic processing; others synthesize from static images.

## Current Artifact Types

- [ ] _tracking_error — horizontal noise band, sync pulse hunting, unstable image
- [ ] _chromatic_aberration — Y/C misalignment, color fringing, edge bloom
- [ ] _dropout — white noise bursts, tape oxide defects, time-correlated clusters
- [ ] _chrominance_noise — subcarrier instability, phase noise, rainbow speckle
- [ ] _dot_crawl — luma-chroma cross-talk, checkerboard pattern at edges
- [ ] _head_switching — visible line at bottom, 4-field periodicity
- [ ] _luma_blooming — aperture correction overshoot, bright halos
- [ ] _color_bleeding — high saturation overflow, chroma bandwidth limitation
- [ ] _generation_loss — copy-of-copy degradation, noise floor rise, detail loss
- [ ] _tape_wear — crease damage, crease flutter, physical deformation ghosts
- [ ] _thermal_color — temperature-dependent magnetization, warm=stable, cool=erratic
- [ ] _pause_degradation — still-frame wear, stretched tape at pause point
- [ ] _rewind_ghost — fast-scanning head, incomplete frame reads, streaking
- [ ] _rf_interference — broadcast signal bleed, ghosting, multipath echoes

## Hardware Variants

- [ ] _ntsc_artifacts — 3.58 MHz subcarrier, line-period color phase
- [ ] _pal_artifacts — 4.43 MHz, line-alternating phase, "Phase Alternate Line"
- [ ] _secam_artifacts — FM chroma, sequential color, "System Essentially Contrary to American Method"
- [ ] _betamax_look — higher bandwidth, sharper, different noise texture
- [ ] _svhs_look — Y/C separated, chroma resolution doubled
- [ ] _8mm_look — smaller cassette, PCM audio, different noise floor
- [ ] _hi8_look — improved 8mm, near-broadcast quality
- [ ] _umatic_look — professional, 3/4 inch, severe color noise

## Aesthetic Compositions

- [ ] _artifact_stack — layering 5+ degradation stages for maximum texture
- [ ] _nostalgia_filter — curated combination: slight tracking + warm chroma shift
- [ ] _horror_static — maximum dropout, noise, broken sync, nightmare aesthetic
- [ ] _ghost_story — delayed echo, multiple translucent layers, memory texture
- [ ] _analog_dream — soft luma, bleeding chroma, gentle tape hiss visualization
- [ ] _datamoshed — intra-frame corruption, macroblock displacement, digital-analog hybrid

## References

- Poynton, C. (1996). *A Technical Introduction to Digital Video*. Wiley.
- Inglis, A. F. (1990). *Video Engineering*. McGraw-Hill.
- Robinson, G. S. (2002). *Video Television Technology*. SMPTE.
- Laird, R. (2000). *The Modulated Triad*. — aesthetic theory of analog artifacts
- Sterling, B. (1995). *The Dead Media Project* — archaeology of obsolete formats
- Various. *VHS Vault* and *Analog Video Preservation* communities

---

*The medium is not transparent. Every tape remembers every playback, every pause, every generation of duplication. The artifact is the memory.*