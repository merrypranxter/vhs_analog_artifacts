// _luma_noise_vhs.frag
// Luma noise — isolated luminance channel noise (tape grain, Y-channel noise floor)
//
// Models three tiers of luma noise:
//   1. Fine grain (fast): high-frequency per-pixel quantisation noise
//   2. Medium grain (mid): correlated patches — tape oxide clumping
//   3. Horizontal banding (slow): head amplifier noise that correlates per-scanline

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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 px = uv * u_resolution;

    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // Tier 1: fine grain (per-pixel, every frame)
    float fineGrain = (hash(px + floor(u_time * 30.0) * vec2(179.3, 83.7)) - 0.5)
                      * 0.045 * u_intensity;

    // Tier 2: medium grain (correlated clusters, ~4px)
    float medGrain = (noise(px * 0.25 + u_time * 15.0) - 0.5) * 0.03 * u_intensity;

    // Tier 3: scanline banding (per-line amplitude noise)
    float lineSeed = floor(uv.y * u_resolution.y) + floor(u_time * 30.0) * 17.0;
    float bandNoise = (hash(vec2(lineSeed * 0.001, lineSeed * 0.007)) - 0.5)
                      * 0.025 * u_intensity;

    yuv.r += fineGrain + medGrain + bandNoise;

    vec3 color = yuvToRGB(yuv);
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
