// _chrominance_noise_ntsc_composite.frag
// NTSC chrominance noise — subcarrier phase jitter, rainbow speckle, chroma snow
//
// Physical basis:
//   The NTSC colour subcarrier sits at 3.579545 MHz, precisely chosen so the
//   chroma sidebands interleave with luma harmonics. Any instability in the
//   voltage-controlled oscillator that regenerates the subcarrier during replay
//   introduces phase noise, which the demodulator reads as hue and saturation
//   errors. On VHS, the low-bandwidth (629 kHz) FM chroma carrier is especially
//   vulnerable; the head-switching transition and tape flutter produce visible
//   rainbow speckle and crawling hue bands.
//
//   "Never Twice the Same Color" — the NTSC engineers' own joke.
//
// References:
//   Poynton, C. (1996). A Technical Introduction to Digital Video. §8, §11
//   SMPTE ST 170M-2004: NTSC composite signal

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

// ── Noise utilities ───────────────────────────────────────────────────────

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

// ── YUV ↔ RGB (BT.601) ───────────────────────────────────────────────────

vec3 rgbToYUV(vec3 c) {
    return vec3(
         0.299  * c.r + 0.587  * c.g + 0.114  * c.b,
        -0.14713* c.r - 0.28886* c.g + 0.436  * c.b + 0.5,
         0.615  * c.r - 0.51499* c.g - 0.10001* c.b + 0.5
    );
}

vec3 yuvToRGB(vec3 yuv) {
    float y = yuv.r, u = yuv.g - 0.5, v = yuv.b - 0.5;
    return vec3(
        y + 1.13983 * v,
        y - 0.39465 * u - 0.58060 * v,
        y + 2.03211 * u
    );
}

// ── Colour bars ───────────────────────────────────────────────────────────

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

// ── NTSC subcarrier phase noise ───────────────────────────────────────────
//
// Phase jitter magnitude grows with tape speed variation.
// Modelled as bandlimited noise on the chroma phase angle.

float subcarrierPhaseNoise(vec2 uv, float t) {
    // Low-frequency wow (tape flutter, ~1-10 Hz)
    float wow = noise(vec2(uv.y * 8.0, t * 4.0)) - 0.5;
    // High-frequency flutter (head scan noise)
    float flutter = hash(vec2(uv.x * 80.0 + uv.y * 300.0, t * 60.0)) - 0.5;
    return wow * 0.6 + flutter * 0.4;
}

// Rainbow speckle: isolated pixels with extreme hue errors
float rainbowSpeckle(vec2 uv, float t) {
    vec2 cell = floor(vec2(uv.x * u_resolution.x, uv.y * u_resolution.y));
    float r = hash(cell * 0.013 + t * 17.3);
    float threshold = mix(0.97, 0.9998, 1.0 - u_intensity);
    return step(threshold, r);
}

// Chroma snow: wideband noise on the colour difference channels
float chromaSnow(vec2 uv, float t) {
    float n = noise(vec2(uv.x * 120.0 + t * 50.0, uv.y * 80.0));
    return (n - 0.5) * u_intensity * 0.35;
}

// Hue crawl: slow diagonal colour bands from subcarrier beating with noise
vec2 chromaShift(vec2 uv, float t) {
    float phase = noise(vec2(uv.y * 6.0, t * 0.9)) * 6.2831853;
    float amp   = u_intensity * 0.12;
    return vec2(cos(phase) * amp, sin(phase) * amp);
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // --- Phase noise on chroma channels ---
    float phaseNoise = subcarrierPhaseNoise(uv, u_time) * u_intensity;
    float angle = phaseNoise * 3.14159 * 0.5;   // up to ±90° phase error
    float cosA = cos(angle), sinA = sin(angle);

    // Rotate UV plane = phase error
    float u_ = yuv.g - 0.5;
    float v_ = yuv.b - 0.5;
    yuv.g = cosA * u_ - sinA * v_ + 0.5;
    yuv.b = sinA * u_ + cosA * v_ + 0.5;

    // --- Chroma snow ---
    yuv.g += chromaSnow(uv, u_time);
    yuv.b += chromaSnow(uv + 0.17, u_time + 100.0);

    // --- VHS chroma bandwidth limiting (approx 629 kHz = ~11 pixel blur) ---
    float blur = 0.018 * u_intensity;
    vec2 shiftUV = uv + vec2(blur, 0.0);
    vec2 chromaUVshift = clamp(shiftUV, 0.0, 1.0);
    vec3 chromaSrc = smpteBars(chromaUVshift);
    vec3 chromaYUV = rgbToYUV(chromaSrc);
    // Blend in the shifted chroma — simulates low-pass bandwidth on C signal
    yuv.g = mix(yuv.g, chromaYUV.g, 0.3 * u_intensity);
    yuv.b = mix(yuv.b, chromaYUV.b, 0.3 * u_intensity);

    // --- Chroma amplitude noise (saturation flutter) ---
    float satNoise = 1.0 + (noise(vec2(uv.y * 20.0, u_time * 3.0)) - 0.5) * 0.4 * u_intensity;
    yuv.g = (yuv.g - 0.5) * satNoise + 0.5;
    yuv.b = (yuv.b - 0.5) * satNoise + 0.5;

    vec3 color = yuvToRGB(yuv);

    // --- Rainbow speckle: random vivid pixel blobs ---
    float speckle = rainbowSpeckle(uv, u_time);
    if (speckle > 0.5) {
        float hue = hash(uv + u_time * 0.1) * 6.2831853;
        vec3 speckleColor = 0.5 + 0.5 * cos(hue + vec3(0.0, 2.094, 4.189));
        color = mix(color, speckleColor, 0.9);
    }

    // Dot crawl hint: high-frequency chroma-luma beat at colour edges
    float dotCrawl = sin(uv.x * u_resolution.x * 3.14159 + u_time * 30.0) * 0.03 * u_intensity;
    color.g += dotCrawl * step(0.1, abs(yuv.g - 0.5));

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
