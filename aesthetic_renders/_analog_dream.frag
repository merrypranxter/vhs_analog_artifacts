// aesthetic_renders/_analog_dream.frag
// Analog dream — soft luma, bleeding chroma, gentle tape hiss visualisation
//
// The analog dream is the opposite of horror static: the artifacts are
// sensuous, warm, languid. The image breathes rather than glitches.
// Colours bleed into each other like watercolour. The grain is the grain
// of something remembered rather than something feared.
//
// Stack:
//   1. Strong chroma bleed (warm, rightward, dreamy)
//   2. Luma bloom (bright areas haloed in soft light)
//   3. Vertical chroma diffusion (inter-line colour mix)
//   4. Tape hiss as visual grain (low-frequency, large cluster)
//   5. Warm saturation boost on mid-tones
//   6. CRT phosphor persistence (mild horizontal smear to the right)
//   7. Soft vignette and slight warmth

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

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
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

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;
    float i = u_intensity;

    // -- 1. Dreamy chroma bleed (wide, exponential) --
    float dx = 1.0 / u_resolution.x;
    float dy = 1.0 / u_resolution.y;

    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // Horizontal chroma bleed (20px right bleed)
    float uAcc = yuv.g, vAcc = yuv.b, wSum = 1.0;
    for (int k = 1; k <= 18; k++) {
        float w = exp(-float(k) * 0.12);
        vec2 sUV = clamp(uv - vec2(float(k) * dx * 1.2, 0.0), 0.0, 1.0);
        vec3  c  = rgbToYUV(smpteBars(sUV));
        uAcc += c.g * w; vAcc += c.b * w; wSum += w;
    }
    yuv.g = uAcc / wSum;
    yuv.b = vAcc / wSum;

    // -- 2. Vertical chroma diffusion (inter-line colour bleeding) --
    for (int k = 1; k <= 3; k++) {
        float w = exp(-float(k) * 0.6);
        float wT = 1.0 + 2.0 * w;
        vec3 above = rgbToYUV(smpteBars(clamp(uv - vec2(0.0, float(k)*dy), 0.0, 1.0)));
        vec3 below = rgbToYUV(smpteBars(clamp(uv + vec2(0.0, float(k)*dy), 0.0, 1.0)));
        yuv.g = (yuv.g + (above.g + below.g) * w) / wT;
        yuv.b = (yuv.b + (above.b + below.b) * w) / wT;
    }

    // Warm saturation boost on mid-tones
    float satBoost = 1.0 + 0.25 * i;
    yuv.g = (yuv.g - 0.5) * satBoost + 0.5;
    yuv.b = (yuv.b - 0.5) * satBoost + 0.5;

    vec3 color = yuvToRGB(yuv);

    // -- 3. Luma bloom --
    float bloomSum = 0.0, bw = 0.0;
    for (int k = -5; k <= 5; k++) {
        float w = exp(-float(k*k) * 0.06);
        float lum = luminance(smpteBars(clamp(uv + vec2(float(k)*dx*2.0, 0.0), 0.0, 1.0)));
        bloomSum += max(0.0, lum - 0.5) * w;
        bw += w;
    }
    float bloom = (bloomSum / bw) * 3.5 * i;
    color += vec3(bloom * 1.0, bloom * 0.9, bloom * 0.7);  // warm bloom

    // -- 4. CRT phosphor persistence (horizontal right smear) --
    float pSmear = (smpteBars(clamp(uv - vec2(dx*2.0, 0.0), 0.0, 1.0))
                  + smpteBars(clamp(uv - vec2(dx*4.0, 0.0), 0.0, 1.0))).r * 0.1 * i;
    color.r += pSmear;
    color.g += pSmear * 0.95;

    // -- 5. Tape hiss as large-cluster grain --
    float hiss = fbm(uv * 8.0 + t * 0.8) * 2.0 - 1.0;
    color += hiss * 0.025 * i;

    // -- 6. Warm amber overall tint --
    float lum2 = luminance(color);
    color.r += 0.03 * lum2 * i;
    color.b -= 0.02 * lum2 * i;

    // -- 7. Soft vignette --
    vec2 vig = uv * 2.0 - 1.0;
    color *= 1.0 - dot(vig, vig) * 0.2 * i;

    // Soft scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.018 * i;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
