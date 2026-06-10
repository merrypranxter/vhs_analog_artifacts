# chromatic_modes/

Shaders focused on chrominance (colour) channel degradation.
These are isolated modes for post-processing or composition pipelines
where only colour artifacts are needed without luma effects.

## Files

| File | Effect | Key uniform |
|------|--------|-------------|
| `_chroma_bleeding_vhs.frag` | Horizontal colour smear, VHS chroma bandwidth | `u_bleedWidth` (pixels, default 12) |
| `_chroma_hue_error_ntsc.frag` | NTSC subcarrier phase drift, hue rotation | `u_hueShift` (degrees, −180 to +180) |

## Chroma bleeding

The 629 kHz VHS chroma bandwidth corresponds to approximately 10–14 pixels of
horizontal colour resolution at NTSC resolution. This shader simulates:
- Rightward horizontal colour smear (low-pass exponential tail)
- Vertical inter-line colour diffusion
- Saturation boost at bleed edges (oxide distortion amplifies chroma)
- Soft saturation clipping with false colour at peak saturation

## Hue error (NTSC)

NTSC's fixed subcarrier phase means any phase error directly shifts all hues.
This shader simulates:
- Static hue shift (via `u_hueShift`) — the "tint" control
- Slow temperature drift (±15° over minutes)
- Per-scanline jitter (high-frequency subcarrier noise)
- Total phase error = static + drift + jitter

## Combining with luma modes

For authentic VHS, combine with `../luminance_modes/_luma_noise_vhs.frag`
and `../luminance_modes/_luma_edge_enhancement.frag`. Compose in YUV space:
apply chromatic effects to UV channels only, luma effects to Y only.
