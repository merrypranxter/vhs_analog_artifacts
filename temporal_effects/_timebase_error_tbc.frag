// _timebase_error_tbc.frag
// Time-base error — horizontal line displacement from tape speed variation
//
// Without a TBC (time-base corrector), each scanline arrives at a slightly
// different horizontal position due to variations in tape speed.
// Low-frequency variation (wow, <10 Hz) causes the image to breathe.
// High-frequency variation (flutter, >10 Hz) causes fine jitter.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i,             vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1,0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0,1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1,1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
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

    // Wow: slow 1–4 Hz horizontal breathing
    float wow     = fbm(vec2(uv.y * 2.0, u_time * 1.5)) * 2.0 - 1.0;
    // Flutter: fast 20–100 Hz fine jitter
    float flutter = noise(vec2(uv.y * 80.0, u_time * 35.0)) * 2.0 - 1.0;

    float wowAmp     = 0.012 * u_intensity;
    float flutterAmp = 0.003 * u_intensity;

    float xDisplace = wow * wowAmp + flutter * flutterAmp;
    vec2 displUV = clamp(uv + vec2(xDisplace, 0.0), 0.0, 1.0);

    vec3 color = smpteBars(displUV);

    // Slight luma variation from tape tension changes
    float tensionNoise = fbm(vec2(uv.y * 5.0, u_time * 0.7)) * 2.0 - 1.0;
    color *= 1.0 + tensionNoise * 0.04 * u_intensity;

    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
