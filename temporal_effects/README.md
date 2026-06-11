# temporal_effects/

Shaders simulating time-domain instability: horizontal displacement from
tape speed variation, vertical sync jitter, and field misalignment.

## Files

| File | Effect | Physical cause |
|------|--------|----------------|
| `_timebase_error_tbc.frag` | Horizontal line displacement (wow + flutter) | Tape speed variation |
| `_frame_jitter_vhs.frag` | Vertical sync instability, frame bounce | Vertical sync pulse noise |

## Time-base error (TBE)

VHS tape speed is never perfectly constant. Two frequency bands of variation:

**Wow** (< 10 Hz): slow breathing, 2–4 Hz, amplitude ±0.5–2.5%
Visual effect: the image slowly sways left and right.

**Flutter** (10–100 Hz): fast fine jitter, amplitude ±0.1–0.5%
Visual effect: fine horizontal shimmer, especially visible on vertical edges.

A **TBC** (time-base corrector) stores each line in a delay buffer and reads
it out with a stable clock, removing TBE. Consumer VHS does not include TBC.

## Frame jitter

Vertical sync instability causes the frame to shift vertically.
Mild: micro-jitter < 1% frame height.
Severe: occasional sync loss → visible frame roll or split.

`_frame_jitter_vhs.frag` simulates:
- Continuous micro-jitter (noise on vsync)
- Occasional hard sync jump (servo momentarily unlocks)
- Bright line at the vertical wrap point during a hard jump

## Combining temporal effects

Stack `_timebase_error_tbc.frag` → `_frame_jitter_vhs.frag` for full
temporal instability. Apply UV sampling displacement **before** any luma or
chroma artifact shaders so the spatial artifacts ride on the displaced signal.
