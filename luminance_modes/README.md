# luminance_modes/

Shaders focused on the luma (Y′) channel — brightness degradation, grain,
and aperture correction artifacts. Complementary to `../chromatic_modes/`.

## Files

| File | Effect | Key uniform |
|------|--------|-------------|
| `_luma_noise_vhs.frag` | Three-tier tape grain: fine/medium/scanline | `u_intensity` |
| `_luma_edge_enhancement.frag` | Aperture correction overshoot, ringing | `u_sharpness` (0–1) |

## Three-tier noise model

### Tier 1: Fine grain (per-pixel)
High-frequency, independent per pixel per frame. Corresponds to shot noise and
electronic noise in the replay amplifier. Amplitude ~1–2 IRE.

### Tier 2: Medium grain (correlated clusters)
4–8 pixel spatial correlation. Corresponds to oxide particle cluster size.
Amplitude ~1 IRE.

### Tier 3: Scanline banding
Correlated per scanline but independent between lines. Corresponds to per-line
amplitude variation in the head amplifier. Amplitude ~0.5 IRE.

## Aperture correction and overshoot

Consumer VCRs apply +6 to +12 dB high-frequency emphasis to compensate for
tape bandwidth limiting. The filter's impulse response produces:
- **White halo** immediately after a dark-to-bright transition
- **Dark ring** (undershoot) before the transition
- **Ringing**: fading echoes of edges repeating at half-cycle intervals

`u_sharpness = 0` produces soft VHS without enhancement.
`u_sharpness = 1` produces maximum overshoot (12 dB — aggressive consumer setting).

## Combining with chromatic modes

Apply luma modes to the Y channel and chromatic modes to the UV channels
separately in YUV space for the most accurate composite artifact simulation.
