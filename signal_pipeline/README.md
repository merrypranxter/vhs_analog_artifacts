# signal_pipeline/

JSON definitions of the composite video encoding/decoding pipeline stages,
from camera RGB to VHS tape and back.

## Pipeline stages

| File | Stage | Description |
|------|-------|-------------|
| `pipeline_rgb_yuv.json` | 1 | RGB → Y′UV (BT.601 matrix, gamma, chroma subsampling) |
| `pipeline_yuv_composite.json` | 2 | Y′UV → composite baseband (subcarrier modulation) |
| `pipeline_composite_rf.json` | 3 | Composite → RF (FM modulation, VHS chroma down-conversion) |
| `pipeline_rf_vhs.json` | 4 | RF → VHS tape (helical scan record/playback, degradation model) |

## Signal flow

```
Camera R′G′B′
    ↓ gamma encode
    ↓ BT.601 matrix  →  Y′, U, V
    ↓ chroma subsample  (4:1:1 NTSC / 4:2:0 PAL)
    ↓ subcarrier modulate  (3.58 MHz NTSC / 4.43 MHz PAL)
    ↓ composite baseband  (Y + C + sync + burst)
    ↓ RF FM modulate  →  channel 3/4 carrier
    ↓ chroma down-convert  →  629 kHz VHS low-band carrier
    ↓ helical scan record  →  magnetic oxide on tape
    ↓ helical scan replay  →  signal + degradation
    ↓ chroma up-convert  →  3.58 MHz restored (with noise)
    ↓ composite decode  →  Y + C separated (dot crawl, cross-colour)
    ↓ YUV → RGB  →  display
```

## Using these files

Each JSON file is a data document — not executable code. Load them in your
runtime to drive shader parameter selection. For example, `pipeline_rf_vhs.json`
contains the `shader_uniforms` and `degradation_per_generation` tables that map
directly to `u_generation` in `_generation_loss_vhs_nth.frag`.
