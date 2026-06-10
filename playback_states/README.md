# playback_states/

Shaders simulating different VHS deck operating modes.
Each state produces a distinct set of artifacts corresponding to
the mechanical and electronic behaviour of the deck.

## Files

| File | State | Key artifacts |
|------|-------|---------------|
| `_playback_normal.frag` | Normal SP playback | Bandwidth limiting, chroma smear, mild grain |
| `_playback_pause.frag` | Pause / still frame | Head wear stripe, freeze shimmer, interlace repeat |
| `_playback_rewind.frag` | Fast rewind scan | Rolling frames, noise bands, speed streaks |
| `_playback_fast_forward.frag` | Fast-forward scan | Downward scroll, tear line, speed stripes |

## Additional uniforms

### `_playback_pause.frag`
- `u_pauseSeconds` — duration of pause (seconds). Wear accumulates logarithmically.
  - 0 s = fresh pause, no wear
  - 10 s = light stripe
  - 60 s = moderate wear band
  - 300 s = severe oxide loss

## Physical basis

In **rewind** and **fast-forward** scan, the tape moves at ~20× normal speed.
The helical heads still rotate but the tracks are severely misaligned — each
scan reads fragments of many adjacent tracks simultaneously. The visible result
is overlapping partial frames separated by noise bands at the track boundaries.

In **pause**, the tape is stationary but the drum continues spinning. The same
track is scanned 1800 times per minute, mechanically destroying its oxide
coating over time.
