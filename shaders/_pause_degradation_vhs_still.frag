// _pause_degradation_vhs_still.frag
// Pause/still-frame wear — repeated head contact on a stationary tape stripe
//
// Physical basis:
//   In pause mode, VHS tape stops moving but the head drum continues to spin at
//   1800 RPM, repeatedly scanning the same helical track. Each rotation removes
//   oxide particles from that track, producing:
//
//   1. A characteristic horizontal stripe of increased noise and dropout
//      aligned with the pause-point track. On a 525-line frame this appears
//      as a ~50-80 line-height band of degradation.
//
//   2. Head saturation: repeated scanning causes the replay head gap to accumulate
//      oxide debris, raising the noise floor and attenuating the signal.
//
//   3. "Freeze shimmer": the displayed field in pause is scanned twice per
//      drum rotation (two heads), causing slight brightness alternation.
//
//   Better decks use a pause-mute circuit that blanks the screen during pause.
//   On cheaper decks, the degrade stripe is visible and worsens over time.
//
// References:
//   Inglis, A. F. (1990). Video Engineering. §14.7 — Pause mode mechanics
//   SMPTE RP 166-1995: VHS pause performance standards

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;       // 0–1
uniform float u_pausePosition;   // 0–1: which scanline is at pause (default 0.5)
uniform float u_pauseDuration;   // seconds of pause (0=fresh, 10=worn, 60=very worn)

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

// ── Pause wear stripe ─────────────────────────────────────────────────────

// Wear accumulates logarithmically with pause duration
float wearAmount(float duration) {
    return clamp(log2(duration + 1.0) / 6.0, 0.0, 1.0) * u_intensity;
}

// Height of the affected band scales with wear (oxide depletion spreads)
float bandHeight(float wear) {
    return 0.05 + wear * 0.12;  // 5–17% of frame height
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 color = smpteBars(uv);

    float pauseY = clamp(u_pausePosition, 0.0, 1.0);
    float wear   = wearAmount(u_pauseDuration);
    float bh     = bandHeight(wear);

    float dist   = abs(uv.y - pauseY);
    float inBand = smoothstep(bh, 0.0, dist);

    if (inBand > 0.001) {
        // Oxide noise: brighter, salt-and-pepper
        float oxideNoise = noise(vec2(uv.x * u_resolution.x * 0.5,
                                      uv.y * u_resolution.y * 0.5 +
                                      floor(u_time * 30.0) * 13.7));
        // Wear gradient: deeper into the band = worse
        float wearDepth  = 1.0 - dist / bh;

        // Mix toward noise
        vec3 noiseColor = vec3(oxideNoise);
        color = mix(color, noiseColor, inBand * wear * wearDepth * 0.85);

        // Brightness suppression from oxide buildup on head
        color *= 1.0 - inBand * wear * wearDepth * 0.4;

        // Horizontal displacement jitter inside band
        float jitter = (noise(vec2(uv.y * u_resolution.y, u_time * 60.0)) - 0.5)
                       * 0.015 * inBand * wear;
        vec2  jUV    = clamp(uv + vec2(jitter, 0.0), 0.0, 1.0);
        vec3  jColor = smpteBars(jUV);
        color = mix(color, jColor, inBand * wear * 0.5);
    }

    // Freeze shimmer: alternating brightness each head pass (1800 RPM = 30 Hz)
    float shimmer = sin(u_time * 188.5) * 0.025 * u_intensity;
    color += shimmer;

    // Scanlines more visible when paused (same field repeated)
    float scanline = sin(uv.y * u_resolution.y * 3.14159) * (0.03 + 0.04 * u_intensity);
    color -= scanline;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
