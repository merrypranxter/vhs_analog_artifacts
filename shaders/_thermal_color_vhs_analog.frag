// _thermal_color_vhs_analog.frag
// Thermal colour drift — temperature-dependent magnetisation hue shift
//
// Physical basis:
//   The Curie temperature of iron-oxide magnetic particles (γ-Fe₂O₃) used in
//   VHS tape is ~590°C — far above storage conditions. However, even modest
//   temperature swings (10–40°C) affect the coercivity and remanence of the
//   particles, changing the effective replay amplitude. More visually interesting:
//   the head gap electronics (pre-amplifier, bias oscillator) drift with temperature,
//   shifting the effective recording/replay gain per channel. Warmer temperatures
//   produce richer, slightly orange-shifted colours (increased V channel).
//   Cold playback produces blue-shifted, brittle colours and increased noise.
//
//   Stored tapes exposed to heat also suffer from "print-through" — magnetic
//   domains bleed across layers of wound tape — appearing as pre-echo or
//   faint ghost images half a second before or after bright transitions.
//
// References:
//   Bertram, H. N. (1994). Theory of Magnetic Recording. §9 — Temperature effects
//   Van Bogart, J. (1995). Magnetic Tape Storage and Handling. CLIR. §4.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;       // 0–1
uniform float u_temperature;     // 0=cold(15°C), 0.5=ambient(25°C), 1=warm(40°C)

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

// ── Temperature-dependent colour matrix ──────────────────────────────────
//
// Cold: cooler white point, reduced saturation, more noise
// Warm: golden/amber white point, richer reds/yellows, slight head bias drift

vec3 thermalColorMatrix(vec3 yuv, float temp) {
    // U/V axis rotation (hue shift) — warm tilts toward yellow/red (+V, -U)
    float angle = (temp - 0.5) * 0.25 * u_intensity; // ±0.125 rad
    float c = cos(angle), s = sin(angle);
    float u_ = yuv.g - 0.5;
    float v_ = yuv.b - 0.5;
    yuv.g = c * u_ - s * v_ + 0.5;
    yuv.b = s * u_ + c * v_ + 0.5;

    // Saturation: warm = slightly more vivid, cold = desaturated
    float satScale = 1.0 + (temp - 0.5) * 0.3 * u_intensity;
    yuv.g = (yuv.g - 0.5) * satScale + 0.5;
    yuv.b = (yuv.b - 0.5) * satScale + 0.5;

    // Luma gain drift: cold = slightly darker; warm = slightly brighter
    float lumaGain = 1.0 + (temp - 0.5) * 0.1 * u_intensity;
    yuv.r *= lumaGain;

    return yuv;
}

// ── Print-through ghost (thermal tape layer bleed) ────────────────────────
//
// Faint echo of future/past image — simulated as very faint horizontal smear
// with offset in Y (wound tape layer spacing ≈ few pixels).

vec3 printThrough(vec2 uv, float temp) {
    float echoStrength = max(0.0, temp - 0.7) * u_intensity * 0.3;
    if (echoStrength < 0.001) return vec3(0.0);
    // Echo from the adjacent wound layer — ~0.5 seconds earlier, tiny V offset
    float dy = 3.0 / u_resolution.y;
    vec3 echo = smpteBars(clamp(uv + vec2(0.003, dy), 0.0, 1.0));
    return echo * echoStrength;
}

// ── Cold noise (increased high-frequency noise at low temp) ───────────────

float coldNoise(vec2 uv, float temp, float t) {
    float coldness = max(0.0, 0.3 - temp) * u_intensity;
    float n = noise(uv * u_resolution * 0.5 + t * 30.0);
    return (n - 0.5) * coldness * 0.15;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float temp = clamp(u_temperature, 0.0, 1.0);

    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // Apply thermal colour matrix
    yuv = thermalColorMatrix(yuv, temp);

    // Slow drift oscillation (head amplifier warm-up, ~30–120 s settling time)
    float drift = sin(u_time * 0.12) * 0.5 + 0.5;
    float driftAngle = drift * (temp - 0.5) * 0.08 * u_intensity;
    float c = cos(driftAngle), s = sin(driftAngle);
    float u_ = yuv.g - 0.5; float v_ = yuv.b - 0.5;
    yuv.g = c * u_ - s * v_ + 0.5;
    yuv.b = s * u_ + c * v_ + 0.5;

    vec3 color = yuvToRGB(yuv);

    // Print-through ghost
    color += printThrough(uv, temp);

    // Cold noise
    float cn = coldNoise(uv, temp, u_time);
    color += cn;

    // Warm amber tint on whites
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 warmTint = vec3(0.04, 0.01, -0.03) * (temp - 0.5) * u_intensity;
    color += warmTint * lum;

    // Scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
