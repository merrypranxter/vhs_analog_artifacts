# docs/

Technical reference documentation for the vhs_analog_artifacts project.

## Files

| File | Contents |
|------|----------|
| `composite_video_encoding.md` | NTSC/PAL composite signal structure, YUV/YIQ colour spaces, frequency interleaving, colour burst, gamma |
| `vhs_mechanics_signal.md` | VHS cassette specification, helical scan mechanics, luma/chroma recording, head switching, tracking, pause mode |
| `signal_degradation_physics.md` | Physics of dropout, chroma phase noise, print-through, generation loss, tape wear tribology, thermal effects |

## Recommended reading order

1. `composite_video_encoding.md` — understand the signal before the medium
2. `vhs_mechanics_signal.md` — understand how the medium stores the signal
3. `signal_degradation_physics.md` — understand how the medium fails

## External references

All documentation cites primary sources. Key references:

- Poynton, C. (2012). *Digital Video and HD*. Morgan Kaufmann.
- Inglis, A. F. (1990). *Video Engineering*. McGraw-Hill.
- Bertram, H. N. (1994). *Theory of Magnetic Recording*. Cambridge University Press.
- Van Bogart, J. W. C. (1995). *Magnetic Tape Storage and Handling*. CLIR.
- SMPTE ST 170M-2004: NTSC Composite Video Signal.
