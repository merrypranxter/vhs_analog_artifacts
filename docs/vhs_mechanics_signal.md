# VHS Mechanics and Signal Path — Technical Reference

## The Cassette

A VHS cassette contains two reels of ½-inch (12.65 mm) magnetic tape on a
polyester (PET) base 20 µm thick, coated with gamma-iron-oxide (γ-Fe₂O₃)
particles 2–4 µm long, oriented longitudinally during manufacture.

```
Tape width:      12.65 mm
Total length:    246 m (T-120 / 6 hour)
Base thickness:  14 µm PET
Oxide thickness: 6 µm (γ-Fe₂O₃)
Coercivity:      650 Oe (standard) / 900 Oe (S-VHS)
Remanence:       1200 Gauss
```

---

## Helical Scan Recording

Unlike audio tape (linear recording), VHS uses **helical scan**: the tape is
wrapped in a shallow helix around a rapidly rotating drum. Video heads mounted
on the drum trace **diagonal tracks** across the tape:

```
Head drum diameter:  62 mm
Head drum speed:     1800 RPM
Head gap:            ~0.3 µm (record) / ~0.6 µm (replay)
Track angle:         5.96°
Track pitch (SP):    58 µm
Number of video heads: 2 (180° apart)
```

Each drum rotation writes **one video field** (one half of an interlaced frame).
Two rotations = one complete frame.

### Track Layout (VHS SP)

```
← tape width 12.65 mm →
┌──────────────────────────────┐
│ guard (top edge)  0.7 mm     │
│ video tracks (diagonal)  ×2  │
│ control track   0.75 mm      │
│ audio track (linear) 1.0 mm  │
│ guard (bottom) 0.25 mm       │
└──────────────────────────────┘
```

The **control track** carries 30 Hz (NTSC) servo pulses. The servo system
locks the head drum phase to the control track, ensuring heads align with
their correct tracks. A tracking adjustment shifts the timing to compensate
for slightly varying track pitch on different tapes.

---

## Signal Recording

### Luma (FM)

Luma is **frequency-modulated** onto a carrier:

```
Sync tip:   3.4 MHz
Black:      3.8 MHz
Peak white: 4.4 MHz (SP)
```

FM encoding makes luma impervious to amplitude variations (the head's read
amplitude varies with tape-head contact), converting them instead to frequency
errors (very small).

### Chroma (down-converted FM)

The 3.58 MHz NTSC subcarrier cannot be directly recorded alongside the luma
FM carrier — there is insufficient bandwidth. Instead, chroma is **heterodyned
down** to a low-bandwidth carrier:

```
f_chroma_record = f_sc − f_pilot ≈ 629.38 kHz
```

A stable pilot oscillator (locked to the incoming burst) provides the
heterodyne reference. On playback, the process is reversed — the 629 kHz
carrier is up-converted back to 3.58 MHz. Any instability in this process
produces chroma phase errors (= hue errors).

---

## Playback Head Sensitivity

The replay head converts magnetic flux variations back to electrical signals.
Head output voltage is proportional to:

1. The rate of change of flux (dΦ/dt) — higher frequencies produce more voltage
2. The head-tape contact area (gap length × track width)
3. The tape-to-head spacing (output falls as exp(−2πd/λ) where d = spacing, λ = wavelength)

### Spacing Loss

Air trapped between tape and head (dirt, oxide shed, deformation) creates an
exponential loss at high frequencies. This is called **spacing loss** and is
the primary mechanism behind high-frequency luma degradation.

```
Loss (dB) = −54.6 × d/λ
```

For a 1 µm spacing gap at 3 MHz (λ ≈ 8 µm): loss ≈ 6.8 dB.

---

## The Head Switching Moment

With two heads 180° apart, each head reads for exactly one field period. At the
changeover point, the servo must switch from Head A to Head B while maintaining
continuous output. The switching happens during the **vertical blanking interval**
— in theory. Consumer decks often allow the switching line to be visible at the
bottom of the active picture (bottom ~4% of the frame), producing the characteristic
**head-switching noise band**.

---

## Tracking

VHS tracking is the alignment of the replay head scan path with the recorded
diagonal tracks. The control track servo locks the drum phase, but mechanical
tolerances mean the alignment is never perfect across all tapes.

**Tracking error** (mistrack) produces:
- A horizontal noise band at the position where the head crosses from one track
  to an adjacent unrelated track
- Width of the noise band scales with the magnitude of misalignment
- A tracking knob/button on the front panel manually offsets the servo timing

The characteristic **VHS tracking noise band** — a rolling horizontal stripe
of white noise — is the most iconic VHS artefact.

---

## Pause Mode

In pause, tape stops but the drum continues at 1800 RPM. The heads repeatedly
scan the same track at the pause point. Each pass removes oxide particles and
writes additional noise into the track until the oxide is substantially
depleted. This is **pause wear** — visible as a horizontal noise stripe whose
width and severity grows with pause duration.

Better decks engage a "pause mute" that blanks the output; cheap decks display
the degrading track live, showing the wear accumulate in real time.

---

## EP/LP Speed

At Extended Play (EP, 3× slower tape speed), track pitch narrows to ~19 µm and
the head reads from multiple adjacent tracks simultaneously, causing **inter-track
interference** that manifests as a herringbone-like noise pattern. EP recordings
have noticeably worse noise characteristics and lower effective bandwidth.

---

## References

- Inglis, A. F. (1990). *Video Engineering*. McGraw-Hill.
- Robinson, G. S. (2002). *Video Television Technology*. SMPTE.
- Mallinson, J. C. (1993). *The Foundations of Magnetic Recording*. Academic Press.
- Van Bogart, J. W. C. (1995). *Magnetic Tape Storage and Handling*. CLIR.
- JVC Corporation. (1976). *VHS Technical Manual*. Victor Company of Japan.
