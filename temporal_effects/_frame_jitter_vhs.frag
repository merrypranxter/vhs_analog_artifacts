// _frame_jitter_vhs.frag
// Frame-level temporal jitter — vertical sync instability, field misalignment
//
// When the VHS vertical sync pulse is noisy or offset, the TV's vertical
// oscillator loses lock and the frame appears to shift vertically.
// Severe cases show the frame "bouncing" or splitting at the top/bottom.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;

float hash(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i,             vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1,0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0,1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1,1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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

    // Occasional vertical sync jump (every 3–15 seconds)
    float syncPeriod = 8.0;
    float syncPhase  = mod(u_time, syncPeriod) / syncPeriod;
    float jumpSize   = 0.0;

    // Jitter spike near the sync moment
    if (syncPhase > 0.95) {
        float spikeFrac = (syncPhase - 0.95) / 0.05;
        jumpSize = sin(spikeFrac * 3.14159) * 0.04 * u_intensity;
    }

    // Continuous micro-jitter (vertical sync noise)
    float microJitter = (noise(vec2(u_time * 2.0, 99.0)) - 0.5) * 0.005 * u_intensity;

    float yOffset = jumpSize + microJitter;
    vec2 jitteredUV = vec2(uv.x, fract(uv.y + yOffset));

    vec3 color = smpteBars(jitteredUV);

    // At the sync jump moment: brief bright line at the wrap point
    float wrapLine = abs(fract(uv.y + yOffset) - fract(uv.y + yOffset + 0.001));
    float brightLine = smoothstep(0.003, 0.0, wrapLine) * abs(jumpSize) * 30.0 * u_intensity;
    color += brightLine;

    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
