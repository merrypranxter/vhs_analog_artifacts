// _dropout_vhs_ntsc.frag
// VHS tape dropout — missing oxide particles cause white-noise spikes
//
// Physical basis:
//   Magnetic oxide particles occasionally detach from the polyester backing.
//   A missing oxide cluster = no signal read = replay as white (full RF) or black
//   (silence) depending on the replay head's default state. VHS replays white.
//   Dropouts cluster in time because one scratch produces many consecutive missing
//   particles. Duration ranges from <1 scanline to several scanlines.
//
// References:
//   Inglis, A. F. (1990). Video Engineering. McGraw-Hill. §12.3
//   SMPTE RP 192-1996: Measurement of dropout characteristics

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0=none, 1=full

// ── Pseudo-random helpers ──────────────────────────────────────────────────

float hash11(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float hash22x(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise
float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i),             hash21(i + vec2(1,0)), f.x),
        mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x),
        f.y
    );
}

// ── Dropout model ─────────────────────────────────────────────────────────
//
// Three tiers of dropout, matching real VHS failure modes:
//   1. Point dropouts  — single-pixel white spikes, very frequent, low visibility
//   2. Streak dropouts — horizontal white dashes, 3-15 pixel wide, medium rate
//   3. Band dropouts   — multi-line noise bands from deep oxide scratches, rare

float pointDropout(vec2 uv, float t) {
    // Quantise to scanline grid — dropout follows scan lines
    vec2 cell = vec2(floor(uv.x * u_resolution.x), floor(uv.y * u_resolution.y));
    float framePhase = floor(t * 30.0); // ~30 fps
    float r = hash21(cell * 0.017 + framePhase * 3.1);
    float threshold = mix(0.994, 0.999, 1.0 - u_intensity);
    return step(threshold, r);
}

float streakDropout(vec2 uv, float t) {
    float line  = floor(uv.y * u_resolution.y);
    float frame = floor(t * 30.0);

    // Decide if this scanline has a streak this frame
    float lineRand = hash21(vec2(line * 0.001, frame * 0.41));
    float threshold = mix(0.985, 0.998, 1.0 - u_intensity);
    if (lineRand < threshold) return 0.0;

    // How wide is the streak?  (in normalised UV)
    float startX = hash21(vec2(line, frame + 100.0));
    float width  = 0.01 + 0.08 * hash21(vec2(line + 1.0, frame));
    float endX   = startX + width;

    if (uv.x < startX || uv.x > endX) return 0.0;

    // Noisy brightness along the streak
    float streak = hash22x(vec2(uv.x * 300.0, line + frame * 7.0));
    return 0.7 + 0.3 * streak;
}

float bandDropout(vec2 uv, float t) {
    float frame = floor(t * 30.0);

    // Rare events: ~1 per 90 frames on average
    float bandRand = hash11(frame * 0.011 + 99.7);
    float threshold = mix(0.97, 0.999, 1.0 - u_intensity);
    if (bandRand < threshold) return 0.0;

    float bandCenter = hash11(frame * 0.037);
    float bandHeight = 0.01 + 0.04 * hash11(frame * 0.059);
    float dist = abs(uv.y - bandCenter);
    if (dist > bandHeight) return 0.0;

    // Noise inside band
    float n = noise2(vec2(uv.x * 40.0, uv.y * 200.0 + t * 3.0));
    return 0.5 + 0.5 * n;
}

// ── SMPTE colour bars test pattern (shared utility) ──────────────────────

vec3 smpteBars(vec2 uv) {
    vec3 bars[7];
    bars[0] = vec3(0.75, 0.75, 0.75);
    bars[1] = vec3(0.75, 0.75, 0.00);
    bars[2] = vec3(0.00, 0.75, 0.75);
    bars[3] = vec3(0.00, 0.75, 0.00);
    bars[4] = vec3(0.75, 0.00, 0.75);
    bars[5] = vec3(0.75, 0.00, 0.00);
    bars[6] = vec3(0.00, 0.00, 0.75);
    int idx = int(clamp(floor(uv.x * 7.0), 0.0, 6.0));
    return bars[idx];
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 color = smpteBars(uv);

    // Apply dropout tiers
    float pt = pointDropout(uv, u_time);
    float st = streakDropout(uv, u_time);
    float bt = bandDropout(uv, u_time);

    // Point dropouts: pure white flash
    color = mix(color, vec3(1.0), pt);

    // Streak dropouts: white, slight yellow tint (oxide burn)
    color = mix(color, vec3(1.0, 0.97, 0.88) * st, step(0.01, st));

    // Band dropouts: noisy white/grey
    color = mix(color, vec3(bt), step(0.01, bt));

    // Scanline darkening
    float scan = sin(uv.y * u_resolution.y * 3.14159) * 0.04;
    color -= scan;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
