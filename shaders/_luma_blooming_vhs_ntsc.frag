// _luma_blooming_vhs_ntsc.frag
// Luma blooming and aperture-correction overshoot — bright halos around edges
//
// Physical basis:
//   VHS tape has a limited luma bandwidth of approximately 3 MHz (SP mode),
//   compared to broadcast's 4.2 MHz. Consumer decks compensate with "aperture
//   correction" — a high-frequency emphasis filter that boosts the signal above
//   ~2 MHz to sharpen edges. The boost is deliberately over-applied (typically
//   +6 to +12 dB at the Nyquist frequency) producing characteristic white-halo
//   "ringing" artifacts on vertical edges. On bright objects the halo can exceed
//   peak white (100 IRE), clipping to fully saturated white = "blooming."
//
//   Additionally, when bright regions exceed tape saturation, the magnetic
//   domains influence adjacent tracks causing "luma bleed" — brightness leaking
//   into neighbouring scanlines.
//
// References:
//   Poynton, C. (1996). A Technical Introduction to Digital Video. §6 — Bandwidth
//   Baldwin, J. (1987). "Aperture Correction in Video." SMPTE Journal 96(7).

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i),             hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
    );
}

vec3 smpteBars(vec2 uv) {
    vec3 bars[7];
    bars[0] = vec3(0.75, 0.75, 0.75);
    bars[1] = vec3(0.75, 0.75, 0.00);
    bars[2] = vec3(0.00, 0.75, 0.75);
    bars[3] = vec3(0.00, 0.75, 0.00);
    bars[4] = vec3(0.75, 0.00, 0.75);
    bars[5] = vec3(0.75, 0.00, 0.00);
    bars[6] = vec3(0.00, 0.00, 0.75);
    return bars[int(clamp(floor(uv.x * 7.0), 0.0, 6.0))];
}

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// ── Aperture correction overshoot ─────────────────────────────────────────
//
// Approximated as: enhanced = original + boost * (original - blurred)
// The "undershoot" before a bright edge (dark halo) and
// "overshoot" after (bright halo) are the signatures.

vec3 apertureCorrection(vec2 uv, float boostDB) {
    float dx = 1.0 / u_resolution.x;
    float boost = pow(10.0, boostDB / 20.0) - 1.0;

    vec3 c   = smpteBars(uv);
    vec3 cL  = smpteBars(uv - vec2(dx * 2.0, 0.0));
    vec3 cLL = smpteBars(uv - vec2(dx * 4.0, 0.0));
    vec3 cR  = smpteBars(uv + vec2(dx * 2.0, 0.0));
    vec3 cRR = smpteBars(uv + vec2(dx * 4.0, 0.0));

    // High-pass: original − blurred (5-tap box blur)
    vec3 blurred = (cLL + cL + c + cR + cRR) / 5.0;
    vec3 highFreq = c - blurred;

    return c + highFreq * boost * u_intensity;
}

// ── Luma bloom ────────────────────────────────────────────────────────────
//
// Bright pixels spread their luminance to neighbours (gaussian-like).
// Implemented as iterative blur of luminance above threshold.

float lumaBloom(vec2 uv) {
    float sum = 0.0;
    float wTotal = 0.0;
    float dx = 1.0 / u_resolution.x;
    float dy = 1.0 / u_resolution.y;

    // 7×1 horizontal blur of supra-threshold luma
    for (int i = -3; i <= 3; i++) {
        vec2 sUV = uv + vec2(float(i) * dx * 2.0, 0.0);
        float lum = luminance(smpteBars(clamp(sUV, 0.0, 1.0)));
        float bright = max(0.0, lum - 0.65);   // only very bright areas bloom
        float w = exp(-float(i * i) * 0.5);
        sum    += bright * w;
        wTotal += w;
    }

    return (sum / wTotal) * 3.0 * u_intensity;
}

// ── VHS luma noise (tape grain) ───────────────────────────────────────────

float lumaGrain(vec2 uv, float t) {
    float n = noise(uv * vec2(u_resolution.x, u_resolution.y) * 0.5 + t * 37.0);
    return (n - 0.5) * 0.04 * u_intensity;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Aperture-corrected image (overshoot = 8 dB → typical consumer VCR)
    vec3 color = apertureCorrection(uv, mix(0.0, 8.0, u_intensity));

    // Add bloom glow on bright areas
    float bloom = lumaBloom(uv);
    color += vec3(bloom * 1.0, bloom * 0.95, bloom * 0.85);   // warm bloom

    // Tape grain
    color += lumaGrain(uv, u_time);

    // VHS bandwidth: soft horizontal blur simulating 3 MHz cutoff
    float dx = 1.0 / u_resolution.x;
    vec3 blur = (
        smpteBars(uv - vec2(dx*3.0,0)) +
        smpteBars(uv - vec2(dx,0))     +
        color                           +
        smpteBars(uv + vec2(dx,0))     +
        smpteBars(uv + vec2(dx*3.0,0))
    ) / 5.0;
    color = mix(color, blur, 0.4 * u_intensity);

    // Scanlines
    float scan = sin(uv.y * u_resolution.y * 3.14159) * 0.03;
    color -= scan;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
