// _chroma_bleeding_vhs.frag
// Chromatic bleed — focused study of chroma horizontal smear in YUV space
//
// A more extreme and isolated version of the colour bleed in the full stack.
// Useful as a standalone chromatic mode for post-processing pipelines.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;
uniform float u_bleedWidth;   // bleed distance in pixels (default: 12)

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
    float bw = max(1.0, u_bleedWidth) * u_intensity;
    float dx = 1.0 / u_resolution.x;

    // Sample luma from current position
    vec3 src  = smpteBars(uv);
    vec3 srcY = rgbToYUV(src);

    // Accumulate chroma from trailing pixels (rightward bleed = left history)
    float uSum = 0.0, vSum = 0.0, wTotal = 0.0;
    for (int i = 0; i < 20; i++) {
        float offset = float(i) * bw / 20.0;
        float w = exp(-float(i) * 0.18);
        vec2 sUV = clamp(uv - vec2(offset * dx, 0.0), 0.0, 1.0);
        vec3 c   = rgbToYUV(smpteBars(sUV));
        uSum    += c.g * w;
        vSum    += c.b * w;
        wTotal  += w;
    }

    vec3 yuv = vec3(srcY.r, uSum / wTotal, vSum / wTotal);

    // Saturation boost on the bled chroma (oxide distortion amplifies edges)
    float satBoost = 1.0 + 0.3 * u_intensity;
    yuv.g = (yuv.g - 0.5) * satBoost + 0.5;
    yuv.b = (yuv.b - 0.5) * satBoost + 0.5;

    // Vertical inter-line bleed
    float dy = 1.0 / u_resolution.y;
    vec3 above = rgbToYUV(smpteBars(clamp(uv - vec2(0, dy), 0.0, 1.0)));
    vec3 below = rgbToYUV(smpteBars(clamp(uv + vec2(0, dy), 0.0, 1.0)));
    yuv.g = mix(yuv.g, (above.g + yuv.g + below.g) / 3.0, 0.2 * u_intensity);
    yuv.b = mix(yuv.b, (above.b + yuv.b + below.b) / 3.0, 0.2 * u_intensity);

    vec3 color = yuvToRGB(yuv);
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
