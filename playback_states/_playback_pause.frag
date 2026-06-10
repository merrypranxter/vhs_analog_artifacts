// _playback_pause.frag
// VHS pause — still-frame display with head wear and freeze shimmer
// See also: _pause_degradation_vhs_still.frag for the detailed pause wear model

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;
uniform float u_pauseSeconds;   // how many seconds paused (wear accumulates)

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

    vec3 color = smpteBars(uv);

    float wear = clamp(log2(u_pauseSeconds + 1.0) / 6.0, 0.0, 1.0) * u_intensity;

    // Pause wear band centred at middle of frame
    float pauseCenter = 0.5;
    float bandHalfH   = 0.08 * (1.0 + wear);
    float dist        = abs(uv.y - pauseCenter);
    float inBand      = smoothstep(bandHalfH, 0.0, dist);

    if (inBand > 0.001) {
        float n = noise(vec2(uv.x * 150.0, uv.y * 100.0 + floor(u_time * 30.0) * 7.3));
        color = mix(color, vec3(n) * 0.8, inBand * wear * 0.9);
        color *= 1.0 - inBand * wear * 0.35;
    }

    // Field shimmer: 30 Hz brightness alternation from two-head scanning
    float shimmer = sin(u_time * 188.5) * 0.03 * u_intensity;
    color += shimmer;

    // Interlace artifact: same field shown twice per drum rotation
    float line   = floor(uv.y * u_resolution.y);
    float repeat = mod(line, 2.0) * 0.05 * u_intensity;
    color -= repeat;

    // Tape grain (slightly elevated in pause — head re-reads same track)
    float grain = (noise(uv * u_resolution * 0.5 + u_time * 20.0) - 0.5) * 0.04 * u_intensity;
    color += grain;

    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.03;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
