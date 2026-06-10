# Composite Video Encoding — Technical Reference

## Overview

Composite video is the encoding scheme that made colour television possible with
a single cable and a backwards-compatible signal. Understanding its structure
is essential to understanding why analog video degrades the way it does.

---

## The Composite Signal

A composite video signal combines four components into a single waveform:

```
E_composite = E_sync + E_blank + E_Y + E_C
```

| Component | Description | IRE level |
|-----------|-------------|-----------|
| `E_sync` | Horizontal and vertical synchronisation pulses | −40 IRE |
| `E_blank` | Blanking interval (no visible content) | 0 IRE |
| `E_Y` | Luma (brightness) | 7.5–100 IRE (NTSC) |
| `E_C` | Chroma (colour, modulated onto subcarrier) | ±20 IRE |

**IRE**: Institute of Radio Engineers. 1 IRE = 7.143 mV in a 1 V p-p signal.

---

## Luma–Chroma Frequency Interleaving

The brilliant insight of NTSC's engineers (Harold Law et al., 1950): the
horizontal-scanning process creates a harmonic comb spectrum. Luma energy
concentrates at multiples of the horizontal line frequency (15.734 kHz for NTSC).
Between these harmonics are spectral gaps.

The chroma subcarrier is placed at an **odd multiple of half the line frequency**:

```
f_sc (NTSC) = 455/2 × f_H = 3.579545 MHz
f_sc (PAL)  = 283.75 × f_H + 25 Hz = 4.433618 MHz
```

This placement causes chroma sidebands to interleave in the spectral gaps of luma.
A comb filter at the decoder can separate them (imperfectly — hence dot crawl and
cross-colour artefacts).

---

## Y′UV and Y′IQ Colour Spaces

### BT.601 Y′UV (used in PAL and many NTSC implementations)

```
Y′ =  0.299 R′ + 0.587 G′ + 0.114 B′
 U = −0.147 R′ − 0.289 G′ + 0.436 B′
 V =  0.615 R′ − 0.515 G′ − 0.100 B′
```

`U` and `V` are the blue-difference and red-difference chroma signals.

### Y′IQ (original NTSC encoding)

The IQ system rotates the colour axes to align with the human visual system:

```
Y′ =  0.299 R′ + 0.587 G′ + 0.114 B′
 I =  0.596 R′ − 0.275 G′ − 0.321 B′   (orange–cyan axis)
 Q =  0.212 R′ − 0.523 G′ + 0.311 B′   (green–magenta axis)
```

The I axis (orange-cyan) is allocated **1.3 MHz bandwidth** because humans are
most sensitive to hue differences along this axis (skin tones, foliage).
The Q axis gets only **0.4 MHz** — this asymmetry is the reason NTSC has
asymmetric colour bandwidth and the distinctive warm, orange-biased look.

---

## NTSC vs PAL: Colour Stability

### NTSC — Fixed phase, cumulative errors

NTSC subcarrier phase is **consistent across lines**. A phase error from the
transmitter or tape propagates unchanged to the display — all colours in the
frame shift by the same hue angle. This is why NTSC sets needed a **tint/hue
control** and why the standard was nicknamed "Never Twice the Same Color."

### PAL — Alternating phase, self-correcting

PAL inverts the V-axis phase on alternate lines. A decoder equipped with a
1H (one-line-period) delay line averages consecutive lines:

```
Line n:   U + jV       (normal)
Line n+1: U − jV       (inverted)
Average:  U + 0        (V errors cancel)
```

Phase errors are thus halved. PAL sets did not need a tint control. Downside:
vertical colour resolution is halved, and a failed delay line produces **Hanover
bars** — alternate lines with inverted colours.

---

## Composite Decoding Artefacts

### Cross-colour (false colour)
High-frequency luma detail (e.g., a thin stripe pattern) falls in the chroma
frequency range and is decoded as colour. Appears as rainbow shimmer on fine
patterns (herringbone fabric, closely spaced lines).

### Cross-luminance (dot crawl)
Chroma energy leaks into the luma channel. At colour transitions the subcarrier
appears as a crawling checkerboard pattern — the "dot crawl" — because the 3.58
MHz subcarrier aliases against the display pixel grid at approximately one
half-cycle per pixel.

### Chroma subsampling
Consumer VHS stores chroma at a dramatically reduced bandwidth (~629 kHz vs
3.58 MHz). The effective chroma resolution is approximately 1/5 of luma
resolution. Result: horizontal colour smear, colours bleeding across neutral
regions.

---

## Colorburst Reference

During the horizontal blanking interval (back porch), **8–10 cycles** of the
unmodulated subcarrier are transmitted as a phase reference for the decoder's
colour killer and reference oscillator. If the burst is noisy or absent (as on
worn VHS tapes), the decoder loses phase lock and produces severe colour errors.

```
NTSC burst phase: 180° (−V axis)
PAL  burst phase: ±135° (alternates ±45° from −V)
```

---

## The Gamma Curve

Television uses non-linear encoding (gamma) to match the CRT's power-law
response and to improve perceptual efficiency:

```
E′ = E^(1/γ)    where γ ≈ 2.2 (NTSC) / 2.8 (PAL)
```

This means camera signals are **gamma-encoded** before transmission. The display
**decodes** them back to linear light. The YUV matrix operates on gamma-encoded
R′G′B′ values (hence the prime notation Y′UV).

VHS tape introduces non-linear distortions to this curve — the tape's B-H
hysteresis is not perfectly linear, causing subtle tone-mapping errors that
contribute to the characteristic VHS "look."

---

## References

- Poynton, C. (1996). *A Technical Introduction to Digital Video*. Wiley.
- Poynton, C. (2012). *Digital Video and HD*. Morgan Kaufmann.
- SMPTE ST 170M-2004: NTSC Composite Video Signal — 525/60.
- SMPTE RP 145-1994: SMPTE C Color Monitor Colorimetry.
- Luther, A. (1997). *Principles of Digital Audio and Video*. Artech House.
- Inglis, A. F. (1990). *Video Engineering*. McGraw-Hill.
