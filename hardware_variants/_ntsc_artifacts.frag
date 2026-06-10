// _ntsc_artifacts.frag
// Full NTSC composite signal artifact stack — authentic NTSC degradation
//
// Synthesises the characteristic look of a degraded NTSC composite signal:
//   • 3.579545 MHz colour subcarrier
//   • 525 lines / 59.94 Hz / 2:1 interlace
//   • 4.2 MHz luma bandwidth (consumer VHS limits this further to ~3 MHz)
//   • YIQ colour space (instead of the more commonly used YUV approximation)
//   • Characteristic "warm" colour palette, dot crawl, and chroma smear
//
// "Never Twice the Same Color" — the NTSC engineers' self-deprecating nickname.
//
// References:
//   SMPTE ST 170M-2004: NTSC composite signal parameters
//   Poynton, C. (2012). Digital Video and HD. §9

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
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i+vec2(1,0)), f.x),
        mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

// ── YIQ colour space (true NTSC encoding) ────────────────────────────────
//
// YIQ rotates the chroma axes to align with skin tones on the I axis.
// This is what makes NTSC colours "warmer" than PAL.

vec3 rgbToYIQ(vec3 c) {
    return vec3(
        0.299  * c.r + 0.587  * c.g + 0.114  * c.b,
        0.5959 * c.r - 0.2746 * c.g - 0.3213 * c.b,
        0.2115 * c.r - 0.5227 * c.g + 0.3112 * c.b
    );
}

vec3 yiqToRGB(vec3 yiq) {
    return vec3(
        yiq.r + 0.9563 * yiq.g + 0.6210 * yiq.b,
        yiq.r - 0.2721 * yiq.g - 0.6474 * yiq.b,
        yiq.r - 1.1070 * yiq.g + 1.7046 * yiq.b
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

// ── NTSC subcarrier: 3.579545 MHz modulated onto 525-line frame ───────────
//
// Phase of the subcarrier reverses on alternate lines (line-alternating phase
// is NOT done in NTSC; it is done in PAL). NTSC uses fixed phase per line,
// which is why colour errors accumulate rather than cancel.

float ntscSubcarrier(vec2 uv, float t) {
    float px   = uv.x * u_resolution.x;
    float line = floor(uv.y * 525.0);   // line number within 525-line frame
    // Subcarrier phase advances by 180° × (line/2) — horizontal period = half pixel
    float phase = px * 3.14159 + line * 1.5708 + t * 22.4;
    return sin(phase);
}

// ── NTSC chroma bandwidth (I: 1.3 MHz, Q: 0.4 MHz) ───────────────────────
//
// The I channel (orange-cyan axis) has wider bandwidth than Q (green-magenta).
// This asymmetry is perceptually motivated (human CSF is more sensitive to I).
// We simulate by blurring Q more than I.

vec3 ntscChromaBandwidth(vec2 uv) {
    float dx = 1.0 / u_resolution.x;
    vec3  src = smpteBars(uv);
    vec3  yiq = rgbToYIQ(src);

    // I channel: 5-tap blur (1.3 MHz ≈ 6px at NTSC resolution)
    float iSum = yiq.g, iW = 1.0;
    for (int i = 1; i <= 3; i++) {
        float w = exp(-float(i * i) * 0.3);
        iSum += rgbToYIQ(smpteBars(clamp(uv - vec2(float(i)*dx,0), 0.0,1.0))).g * w;
        iSum += rgbToYIQ(smpteBars(clamp(uv + vec2(float(i)*dx,0), 0.0,1.0))).g * w;
        iW   += 2.0 * w;
    }

    // Q channel: 11-tap blur (0.4 MHz ≈ 20px)
    float qSum = yiq.b, qW = 1.0;
    for (int j = 1; j <= 5; j++) {
        float w = exp(-float(j * j) * 0.12);
        qSum += rgbToYIQ(smpteBars(clamp(uv - vec2(float(j)*dx,0), 0.0,1.0))).b * w;
        qSum += rgbToYIQ(smpteBars(clamp(uv + vec2(float(j)*dx,0), 0.0,1.0))).b * w;
        qW   += 2.0 * w;
    }

    yiq.g = iSum / iW;
    yiq.b = qSum / qW;
    return yiqToRGB(yiq);
}

// ── NTSC colour phase error (the "Never Twice" phenomenon) ────────────────

vec3 ntscPhaseNoise(vec3 yiq, vec2 uv, float t) {
    // Phase instability — depends on tape speed (wow/flutter)
    float phaseErr = (noise(vec2(uv.y * 4.0, t * 2.0)) - 0.5) * 0.4 * u_intensity;
    float c = cos(phaseErr), s = sin(phaseErr);
    float i_ = yiq.g, q_ = yiq.b;
    yiq.g = c * i_ - s * q_;
    yiq.b = s * i_ + c * q_;
    return yiq;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Bandwidth-limited source
    vec3 color  = ntscChromaBandwidth(uv);
    vec3 yiq    = rgbToYIQ(color);

    // NTSC colour phase noise
    yiq = ntscPhaseNoise(yiq, uv, u_time);

    // Subcarrier interference on luma
    float sc = ntscSubcarrier(uv, u_time);
    yiq.r += sc * 0.02 * u_intensity;

    // Dot crawl at colour transitions
    float crawl = sc * (noise(vec2(uv.x * 40.0, u_time)) - 0.5) * 0.05 * u_intensity;
    yiq.r += crawl;

    // VHS warmth: slight gain on I axis (orange-cyan = skin warmth)
    yiq.g *= 1.0 + 0.1 * u_intensity;

    color = yiqToRGB(yiq);

    // NTSC black level setup: 7.5 IRE black (lift shadows slightly)
    color = color * (1.0 - 0.075 * u_intensity) + 0.075 * 0.075 * u_intensity;

    // Tape noise grain
    float grain = (noise(uv * u_resolution * 0.5 + u_time * 30.0) - 0.5) * 0.03 * u_intensity;
    color += grain;

    // Scanlines (interlaced: even/odd field darkening)
    float line = floor(uv.y * u_resolution.y);
    float field = mod(floor(u_time * 60.0), 2.0);
    float interlace = mod(line + field, 2.0) * 0.06 * u_intensity;
    color -= interlace;
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.03;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
