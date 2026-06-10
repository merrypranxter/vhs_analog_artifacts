# aesthetic_renders/

Curated compositions — artifact stacks assembled for deliberate aesthetic
effect rather than technical accuracy. These are the creative destinations:
specific emotional registers achieved through layered degradation.

## Compositions

| File | Aesthetic | Mood | Key artifacts |
|------|-----------|------|---------------|
| `_nostalgia_filter.frag` | Gentle, warm, familiar | Childhood memory, comfort | Warm chroma, fine grain, soft scanlines, vignette |
| `_horror_static.frag` | Aggressive, frightening | Fear, paranoia, signal death | Broken sync, dense dropout, rainbow chaos, dark crush |
| `_ghost_story.frag` | Translucent, layered | Memory, haunting, presence | Echo layers, desaturation, edge glow, cool tone |
| `_analog_dream.frag` | Soft, sensuous, blurred | Reverie, warmth, dissolution | Wide chroma bleed, bloom, hiss grain, phosphor smear |
| `_artifact_stack.frag` | Heavily processed, rich | Maximum texture, VHS overload | All 9 degradation stages |
| `_datamoshed.frag` | Glitchy, digital-analog | Uncanny, corrupted, broken | Macroblock displacement + VHS noise |

## Design philosophy

These shaders are not technically precise — they are **aesthetically curated**.
Each one targets a specific emotional register that analog artifacts can evoke:

- **Nostalgia**: the artifacts of comfort and familiarity, calibrated so
  degradation is noticeable but never anxious. The tape has been played many
  times; it remembers being watched.

- **Horror**: the artifacts of failure and signal death. The tape is fighting
  to show you something. The image barely holds together. Recognition flickers.

- **Ghost story**: the artifacts of persistence and memory. Past frames bleed
  into the present. The medium has stored too much; it is haunted by its content.

- **Analog dream**: the artifacts of softness and dissolution. The image
  breathes; colours bleed into one another like watercolour. Time is liquid.

- **Artifact stack**: maximum density, maximum texture. The kitchen-sink
  approach for when you want the full spectrum of analog degradation.

- **Datamosh**: the impossible hybrid — what if VHS and H.264 corruption
  happened simultaneously? Digital macroblocks wearing analog noise.

## `u_intensity` as emotional register

All compositions accept `u_intensity` (0–1):
- 0.0: clean source (no effect)
- 0.3: subtle, almost subliminal presence
- 0.6: clearly degraded but still legible (most aesthetically useful range)
- 0.8: heavily degraded, texture dominant
- 1.0: maximum degradation (varies per composition)
