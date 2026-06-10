// _pal_artifacts.frag
// Full PAL composite signal artifact stack — authentic PAL degradation
//
// PAL (Phase Alternate Line) was developed in Germany and introduced in 1967.
// The key innovation: the phase of the chroma subcarrier is reversed on
// alternate lines. This means colour phase errors from one line partially
// cancel with the adjacent line's inverted error — hence "Phase Alternate Line."
//
// PAL characteristics:
//   • 4.43361875 MHz colour subcarrier
//   • 625 lines / 50 Hz / 2:1 interlace
//   • 5.5 MHz luma bandwidth (better than NTSC's 4.2 MHz)
//   • YUV colour space (no IQ rotation)
//   • "Hanover bars": the phase-alternating cancellation when delayed, producing
//     horizontal stripe pattern when the PAL delay line fails
//   • Generally more stable colour than NTSC, but different characteristic noise
//
// "Phase Alternate Line" (also "Perfection at Last" — British engineers' joke)
//
// References:
//   SMPTE RP 145-1994: PAL composite signal parameters
//   Poynton, C. (2012). Digital Video and HD. §10 — PAL encoding

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;           // 0–1
uniform float u_delayLineError;      // 0=perfect PAL, 1=PAL without delay line

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

// ── PAL phase alternation ─────────────────────────────────────────────────
//
// On even lines, V is encoded normally.
// On odd lines, V is negated (phase inverted).
// The decoder uses a 1H delay line to average adjacent lines, cancelling errors.

float palLineSign(vec2 uv) {
    float line = floor(uv.y * 625.0);
    return (mod(line, 2.0) < 0.5) ? 1.0 : -1.0;
}

// ── PAL subcarrier: 4.433 MHz ─────────────────────────────────────────────

float palSubcarrier(vec2 uv, float t) {
    float px   = uv.x * u_resolution.x;
    float line = floor(uv.y * 625.0);
    // Phase increments by 135° per line in PAL (different from NTSC's 90°)
    float phase = px * 3.14159 + line * 2.356194 + t * 27.85;
    return sin(phase);
}

// ── Hanover bars ──────────────────────────────────────────────────────────
//
// When the PAL delay line fails or is misaligned, the phase alternation is
// NOT corrected, and alternate lines have opposite colour phase.
// Result: horizontal stripes of complementary colours — "Hanover bars."

vec3 hanoversBarEffect(vec3 yuv, vec2 uv, float errorAmount) {
    if (errorAmount < 0.001) return yuv;
    float sign = palLineSign(uv);
    // Shift hue by sign — uncancelled phase inversion
    float u_ = yuv.g - 0.5;
    float v_ = yuv.b - 0.5;
    // Invert V on odd lines (uncorrected)
    yuv.b = (-sign * v_) * errorAmount + v_ * (1.0 - errorAmount) + 0.5;
    return yuv;
}

// ── PAL chroma bandwidth (5.5 MHz luma, wider than NTSC) ─────────────────

vec3 palBandwidth(vec2 uv) {
    float dx = 1.0 / u_resolution.x;
    // PAL U and V share equal bandwidth (~1.3 MHz each)
    vec3  yuvCenter = rgbToYUV(smpteBars(uv));
    float uSum = yuvCenter.g, vSum = yuvCenter.b, w = 1.0;
    for (int i = 1; i <= 4; i++) {
        float wi = exp(-float(i * i) * 0.25);
        vec3 left  = rgbToYUV(smpteBars(clamp(uv - vec2(float(i)*dx, 0), 0.0, 1.0)));
        vec3 right = rgbToYUV(smpteBars(clamp(uv + vec2(float(i)*dx, 0), 0.0, 1.0)));
        uSum += (left.g + right.g) * wi;
        vSum += (left.b + right.b) * wi;
        w    += 2.0 * wi;
    }
    yuvCenter.g = uSum / w;
    yuvCenter.b = vSum / w;
    return yuvToRGB(yuvCenter);
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 color = palBandwidth(uv);
    vec3 yuv   = rgbToYUV(color);

    // Hanover bars (delay line error)
    yuv = hanoversBarEffect(yuv, uv, u_delayLineError * u_intensity);

    // PAL subcarrier interference on luma (4.43 MHz)
    float sc = palSubcarrier(uv, u_time);
    yuv.r += sc * 0.015 * u_intensity;

    // PAL colour phase noise — less severe than NTSC thanks to alternation
    float phaseNoise = (noise(vec2(uv.y * 3.0, u_time * 1.5)) - 0.5) * 0.2 * u_intensity;
    // Phase errors partially cancel (PAL averaging effect)
    float cancellation = 0.7;  // perfect PAL delay line cancels 50%; real = ~70%
    phaseNoise *= (1.0 - cancellation);

    float c = cos(phaseNoise), s = sin(phaseNoise);
    float u_ = yuv.g - 0.5, v_ = yuv.b - 0.5;
    yuv.g = c * u_ - s * v_ + 0.5;
    yuv.b = s * u_ + c * v_ + 0.5;

    // PAL 50 Hz hum bar (UK 50 Hz mains)
    float humPhase = fract(u_time * 50.0 / 625.0);
    float barDist  = fract(uv.y - humPhase);
    float humBar   = smoothstep(0.04, 0.0, barDist) * 0.08 * u_intensity;
    yuv.r -= humBar;

    color = yuvToRGB(yuv);

    // PAL cooler look: slight blue bias in whites (European studio tradition)
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color.b += lum * 0.02 * u_intensity;
    color.r -= lum * 0.01 * u_intensity;

    // Tape grain
    float grain = (noise(uv * u_resolution * 0.5 + u_time * 30.0) - 0.5) * 0.025 * u_intensity;
    color += grain;

    // Scanlines (625-line interlace, 50 Hz fields)
    float line  = floor(uv.y * u_resolution.y);
    float field = mod(floor(u_time * 50.0), 2.0);
    float interlace = mod(line + field, 2.0) * 0.055 * u_intensity;
    color -= interlace;
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
