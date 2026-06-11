// _playback_rewind.frag
// VHS rewind scan — fast-reverse head, incomplete frame reads, streaking
//
// During rewind, the tape moves at ~20× normal speed in reverse.
// The helical scan heads still trace across the tape but the tracks are
// now misaligned — each scan reads a fraction of its intended track and
// much of another track's data. The result:
//
//   1. Multiple partial frames overlapping at different vertical positions
//   2. Strong horizontal streaks from head mis-tracking (white noise bands)
//   3. Rapid vertical scrolling / rolling
//   4. Intermittent "snapshots" of recognisable image between noise bursts
//
// This shader simulates the visual chaos of fast-rewind playback.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;

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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Fast reverse: frame rolls upward at ~20× speed
    float rollSpeed = 20.0;
    float rollY = fract(uv.y + u_time * rollSpeed * 0.03);

    // Mis-tracking: multiple overlapping partial frames
    float frame1Y = fract(rollY);
    float frame2Y = fract(rollY + 0.33);
    float frame3Y = fract(rollY + 0.67);

    vec3 f1 = smpteBars(vec2(uv.x, frame1Y));
    vec3 f2 = smpteBars(vec2(uv.x, frame2Y));
    vec3 f3 = smpteBars(vec2(uv.x, frame3Y));

    // Weight by proximity — primary frame is brightest
    vec3 color = f1 * 0.55 + f2 * 0.30 + f3 * 0.15;

    // Horizontal noise bands (mis-tracking)
    float linePhase = fract(uv.y * 8.0 + u_time * 5.0);
    float isMistrack = step(0.6, noise(vec2(linePhase * 3.0, u_time * 10.0)));
    float mistNoise = noise(vec2(uv.x * 80.0 + u_time * 200.0, uv.y * 50.0));
    color = mix(color, vec3(mistNoise), isMistrack * 0.85 * u_intensity);

    // White noise bursts
    float burst = hash(vec2(uv.x * 200.0 + u_time * 300.0, uv.y * 60.0));
    color = mix(color, vec3(1.0), step(0.95, burst) * u_intensity);

    // Strong horizontal jitter
    float jitter = (noise(vec2(uv.y * 300.0, u_time * 100.0)) - 0.5) * 0.05 * u_intensity;
    vec3 jColor = smpteBars(clamp(uv + vec2(jitter, 0.0), 0.0, 1.0));
    color = mix(color, jColor, 0.3);

    // Scanlines (barely visible in the chaos)
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.015;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
