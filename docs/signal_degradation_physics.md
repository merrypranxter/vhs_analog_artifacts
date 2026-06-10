# Signal Degradation Physics — Technical Reference

## Taxonomy of VHS Degradation

VHS signal degradation has three primary causes, each with characteristic
visual signatures:

| Cause | Physical mechanism | Visual signature |
|-------|--------------------|-----------------|
| **Oxide particle loss** | Abrasion removes coating | White dropout spikes, bands |
| **Magnetic instability** | Phase jitter, flux decay | Chroma noise, hue errors |
| **Mechanical deformation** | Tape base warps, stretches | Time-base error, flutter |

---

## Dropout

### Physics

Magnetic tape stores information as oriented magnetic domains in oxide particles.
When a particle is **missing** (abraded away) or **detached** (shed oxide), the
head reads zero signal from that location. The replay amplifier, receiving no
signal, defaults to its DC bias state — which in VHS manifests as **full white
(100 IRE)**.

### Dropout Distribution

Particle loss is not uniform. Abrasion follows the mechanical contact profile:
highest pressure at the head-entry side, plus any crease damage zones. Oxide
also sheds in clusters — one detached particle dislodges adjacent ones.

**Time-domain characteristics:**
```
Point dropout:   < 1 µs   (~1–2 pixels)
Streak dropout:  1–30 µs  (3–80 pixels wide)
Band dropout:    > 1 line  (1–20+ lines tall)
```

### Dropout Compensator (DOC)

Most consumer decks include a dropout compensator: when a dropout is detected
(signal amplitude falls below a threshold), the previous line's signal is
substituted. This hides brief dropouts at the cost of vertical resolution.
On severe tapes, the DOC cannot keep up, and uncompensated dropouts appear.

---

## Chroma Phase Noise

### Physics

The VHS chroma carrier (629 kHz down-converted subcarrier) is **FM-encoded**
onto the tape. Any variation in tape speed during record or replay produces a
corresponding shift in the recovered frequency — which, when up-converted back
to 3.58 MHz, appears as a **phase error** on the chroma subcarrier.

Phase error → hue error: a 10° phase shift at the subcarrier frequency shifts
all colours by 10° in the IQ plane. For NTSC (no line-to-line correction),
this error is directly visible as a hue shift. For PAL (line alternation),
errors up to ~5° are self-correcting; larger errors produce residual saturation
errors or Hanover bars.

### Sources of Phase Noise

| Source | Frequency | Typical magnitude |
|--------|-----------|------------------|
| Tape wow (wow) | 1–10 Hz | ±2–5° |
| Tape flutter | 10–100 Hz | ±0.5–2° |
| Head-drum jitter | 30/60 Hz and harmonics | ±1–3° |
| Temperature drift | 0.001–0.1 Hz | ±5–20° |
| Tracking instability | Sudden/random | ±10–90° |

### Saturation Collapse

When chroma phase error exceeds ~45°, the decoder may lose colour lock entirely
and output a grey (desaturated) image. Consumer decoders have a "colour killer"
circuit that mutes chroma entirely when phase error becomes too large — this
is why a severely deteriorated tape shows intermittent black-and-white sections.

---

## Magnetic Print-Through

### Physics

Magnetic domains exert influence on adjacent magnetic material. When tape is
stored wound on a reel, each layer of tape is in close proximity to the layers
above and below it. Over time (weeks to years at elevated temperature), magnetic
field from a high-magnetisation region "prints through" to adjacent layers.

**Print-through** appears as a faint pre-echo or post-echo of loud/bright signals
offset by the distance between layers:

```
Time offset = layer spacing / tape speed
            ≈ 20 µm / 23.39 mm/s ≈ 0.86 ms
            ≈ 1 video field = ~16.7 ms
```

At video speeds this spacing often aligns to approximately one field period,
so print-through appears as a ghostly pre-image or after-image one frame before
or after a bright scene transition.

### Temperature Dependence

Print-through rate increases approximately **1.5–2 dB per 10°C** temperature rise
above room temperature. Tapes stored in hot environments (car glove boxes, attics)
suffer dramatically accelerated print-through.

---

## Generation Loss

### Noise Accumulation Model

Each dub (copy) adds the recorder's inherent noise to the signal:

```
SNR_n = 10 log₁₀ ( 1 / Σᵢ₌₁ⁿ 10^(−SNR_i/10) )
```

For identical decks (SNR = 43 dB each):
```
Generation 1:  43 dB
Generation 2:  40 dB  (−3 dB)
Generation 3:  37.7 dB
Generation 4:  35.8 dB
Generation 5:  34.3 dB
```

### Chroma Error Accumulation

Each chroma encode-decode cycle adds its own phase error. Errors are **additive**
(not self-correcting across generations):

```
σ_chroma_n = √n × σ_chroma_1
```

For σ_chroma_1 = 5°: by generation 4, σ_chroma ≈ 10° → visible colour errors.

### Bandwidth Erosion

Each VHS recorder applies its own bandwidth-limiting lowpass filter.
Successive filtering reduces effective bandwidth multiplicatively:

```
BW_n ≈ BW_1 × (0.93)^(n−1)    [empirical approximation]
```

By generation 5: BW ≈ 0.69 × BW_1 ≈ 2.1 MHz effective luma bandwidth.
Fine detail (high spatial frequency) is progressively lost.

---

## Tape Wear — Tribology

### Friction and Oxide Abrasion

The head-tape interface is a **tribological system**: two surfaces in relative
motion under load. The head drum rotates at 1800 RPM; tape tension applies
the tape to the drum. The coefficient of friction between magnetic oxide and
the ferrite head gap is approximately 0.3–0.4.

Abrasion rate depends on:
- Normal force (tape tension, head pressure)
- Relative velocity (drum speed × number of plays)
- Surface hardness mismatch (oxide is softer than ferrite)
- Lubrication (tape backcoating provides some boundary lubrication)

### Oxide Transfer

Abraded particles deposit in the head gap and on the drum surface. Accumulated
oxide raises the effective head-to-tape spacing (spacing loss increases).
Regular cleaning (isopropyl alcohol on a foam pad) removes this buildup.

### Deformation and Flutter

The tape base (PET polyester) has finite creep under stress. At crease points,
permanent deformation bends the base, causing the tape to lift off the drum at
that position each revolution — producing the characteristic crease dropout.

Long periods under tension (cinching, improper storage) stretch the tape base,
elongating tracks and causing **flutter** — rapid variation in tape speed.

---

## Thermal Effects

### Curie Temperature

The Curie temperature of γ-Fe₂O₃ is approximately 590°C — far above operating
conditions. However, **coercivity decreases** with temperature even well below
Curie:

```
H_c(T) ≈ H_c(20°C) × (1 − T/T_c)^α    where α ≈ 0.5
```

At 40°C (hot room): H_c reduces by ~1.5%, reducing the signal amplitude by
a small but measurable amount.

### Head Amplifier Drift

The pre-amplifier electronics drift with temperature. A cold amplifier has
higher noise (Johnson noise ∝ √T, but also transistor parameters shift).
A warm amplifier has lower noise floor but may exhibit bias point drift
affecting the chroma phase reference.

---

## References

- Bertram, H. N. (1994). *Theory of Magnetic Recording*. Cambridge University Press.
- Mallinson, J. C. (1993). *The Foundations of Magnetic Recording*. Academic Press.
- Geller, L., Stermer, J. E., & Wernick, J. H. (2006). "Mechanical Wear of Magnetic Tape
  in Contact with Ferrite Heads." *Journal of Magnetism and Magnetic Materials*.
- Van Bogart, J. W. C. (1995). *Magnetic Tape Storage and Handling: A Guide for
  Libraries and Archives*. CLIR / NML.
- Hess, R. L. (2008). "Tape Degradation Factors and Challenges in Predicting
  Tape Life." *ARSC Journal* 39(2).
- Inglis, A. F. (1990). *Video Engineering*. McGraw-Hill. §12–14.
