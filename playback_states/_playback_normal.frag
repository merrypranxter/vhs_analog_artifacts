// _playback_normal.frag
// Normal VHS playback — baseline consumer VHS at SP (Standard Play) speed
//
// Reference state for all other playback shaders. Includes only the
// artifacts inherent to normal VHS playback: reduced bandwidth,
// limited chroma resolution, mild tape grain, and scanlines.

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

    // VHS horizontal bandwidth limiting (3 MHz luma, 629 kHz chroma)
    float dx = 1.0 / u_resolution.x;
    vec3 src = smpteBars(uv);
    // Luma blur (3-tap)
    vec3 blurL = (smpteBars(clamp(uv-vec2(dx,0),0.,1.)) + src + smpteBars(clamp(uv+vec2(dx,0),0.,1.))) / 3.0;

    vec3 yuv = rgbToYUV(src);
    vec3 yuvB = rgbToYUV(blurL);

    // Apply chroma blur (wider) and luma blur (narrower)
    yuv.r = mix(yuv.r, yuvB.r, 0.3 * u_intensity);
    yuv.g = mix(yuv.g, yuvB.g, 0.6 * u_intensity);
    yuv.b = mix(yuv.b, yuvB.b, 0.6 * u_intensity);

    // VHS saturation reduction (~70% of broadcast)
    float satScale = mix(1.0, 0.72, u_intensity);
    yuv.g = (yuv.g - 0.5) * satScale + 0.5;
    yuv.b = (yuv.b - 0.5) * satScale + 0.5;

    // Tape grain
    float grain = (noise(uv * u_resolution * 0.5 + u_time * 25.0) - 0.5) * 0.025 * u_intensity;
    yuv.r += grain;

    // Head switching pulse (bottom 4%)
    float inZone = step(0.96, uv.y);
    if (inZone > 0.5) {
        float jitter = (noise(vec2(uv.y * 200.0, u_time * 60.0)) - 0.5) * 0.01 * u_intensity;
        yuv.r += jitter;
        yuv.g = mix(yuv.g, 0.5, 0.3 * u_intensity);
        yuv.b = mix(yuv.b, 0.5, 0.3 * u_intensity);
    }

    vec3 color = yuvToRGB(yuv);

    // Subtle scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02 * u_intensity;

    // Slight warm tint (VHS tape orange)
    color.r += 0.01 * u_intensity;
    color.b -= 0.01 * u_intensity;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
