// _rf_interference_ntsc_ghost.frag
// RF interference — broadcast signal bleed, ghosting, multipath echoes
//
// Physical basis:
//   Before cable TV became universal, NTSC broadcast signals arrived via rooftop
//   antenna. Radio-frequency interference from adjacent channels, reflections off
//   buildings (multipath), and induction from electrical equipment all corrupted
//   the composite signal. Common manifestations:
//
//   1. Ghosting: a delayed copy of the image appears offset to the right.
//      Caused by reflected signals arriving 1–10 µs after the direct path,
//      corresponding to horizontal displacement of ~7–70 pixels at NTSC rates.
//
//   2. Herringbone / venetian-blind interference: a diagonal striped pattern
//      caused by a nearby carrier (CB radio, adjacent TV channel) beating with
//      the NTSC subcarrier.
//
//   3. Horizontal noise bands: 60 Hz electrical hum modulating the video signal.
//
//   4. Co-channel interference: another TV station on the same frequency
//      produces a ghostly second image rolling slowly through the frame.
//
// References:
//   Inglis, A. F. (1990). Video Engineering. §16.2 — Interference sources
//   SMPTE RP 218-1998: Measurement of multipath distortion

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

// ── Ghost / multipath echo ────────────────────────────────────────────────
//
// Each ghost is a delayed (right-shifted) copy with attenuated amplitude.
// Multiple ghosts from multiple reflection paths sum together.

vec3 multipath(vec2 uv) {
    vec3 direct = smpteBars(uv);
    vec3 ghosts = vec3(0.0);

    // Primary ghost: ~15 px right, 35% amplitude
    float g1offset = 15.0 / u_resolution.x;
    float g1amp    = 0.35 * u_intensity;
    vec3  g1       = smpteBars(clamp(uv - vec2(g1offset, 0.0), 0.0, 1.0));

    // Secondary ghost: ~40 px right, 18% amplitude, slight vertical smear
    float g2offset = 40.0 / u_resolution.x;
    float g2amp    = 0.18 * u_intensity;
    vec3  g2       = smpteBars(clamp(uv - vec2(g2offset, 1.0/u_resolution.y), 0.0, 1.0));

    // Negative ghost (pre-ghost from overshoot): 5 px left, 10% amplitude
    float gnoffset = 5.0 / u_resolution.x;
    float gnamp    = 0.10 * u_intensity;
    vec3  gn       = smpteBars(clamp(uv + vec2(gnoffset, 0.0), 0.0, 1.0));

    ghosts = g1 * g1amp + g2 * g2amp - gn * gnamp;
    return direct + ghosts;
}

// ── Herringbone interference ──────────────────────────────────────────────
//
// Diagonal pattern from an adjacent carrier beating with the NTSC sync.
// Frequency offset causes the pattern to drift at a rate proportional to ∆f.

float herringbone(vec2 uv, float t) {
    // ~4 Hz beat rate (adjacent carrier ~4 Hz away from subcarrier)
    float beat = sin(uv.x * u_resolution.x * 0.628 +
                     uv.y * u_resolution.y * 0.157 +
                     t * 25.13);
    float envelope = 0.06 * u_intensity;
    return beat * envelope;
}

// ── 60 Hz hum bar ─────────────────────────────────────────────────────────
//
// Power-supply coupling introduces a 60 Hz vertical undulation.
// Appears as a faintly darker horizontal band moving upward every ~16.7 ms.

float humBar(vec2 uv, float t) {
    float humPhase = fract(t * 60.0 / 525.0);  // one hum bar per 525-line frame
    float barY     = fract(uv.y - humPhase);
    float barWidth = 0.04;
    float bar      = smoothstep(barWidth, 0.0, barY) * smoothstep(barWidth, 0.0, 1.0 - barY);
    return bar * 0.12 * u_intensity;
}

// ── Co-channel rolling ghost ──────────────────────────────────────────────
//
// A second station on the same channel whose vertical sync differs by a fraction
// of a frame — the ghost image slowly rolls through the frame.

vec3 coChannel(vec2 uv, float t) {
    // Roll speed ~0.2 frames/sec (slightly offset sync)
    float rollY  = fract(uv.y + t * 0.2);
    vec2  rollUV = vec2(uv.x, rollY);
    vec3  ghost  = smpteBars(rollUV);
    // Strong herringbone on the co-channel image
    float hb = herringbone(rollUV, t) * 0.5;
    ghost = ghost * 0.18 * u_intensity + hb;
    return ghost;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Multipath ghosts
    vec3 color = multipath(uv);

    // Herringbone overlay
    color += herringbone(uv, u_time);

    // Hum bar darkening
    color *= 1.0 - humBar(uv, u_time);

    // Co-channel interference
    color += coChannel(uv, u_time);

    // RF noise floor
    float rfNoise = (noise(uv * u_resolution * 0.3 + u_time * 50.0) - 0.5) * 0.04 * u_intensity;
    color += rfNoise;

    // Scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
