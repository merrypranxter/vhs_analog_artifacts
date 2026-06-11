// _generation_loss_vhs_nth.frag
// Nth-generation duplication loss — noise floor rise, resolution erosion
//
// Physical basis:
//   Every time a VHS tape is dubbed (copied), the signal passes through an
//   additional encode-decode cycle. Each cycle adds:
//     • Noise floor rise: recorder's own noise adds to signal, raising SNR floor
//       by approximately 3–4 dB per generation
//     • Chroma re-processing: re-encoding/decoding doubles colour errors
//     • Bandwidth narrowing: successive LP filters reduce effective resolution
//     • Sync instability: TBC errors accumulate, causing micro-jitter
//     • Saturation reduction: chroma amplitude shrinks with each dub
//
//   Typical consumer VHS is unusable by generation 4–5. S-VHS lasts to 7–8.
//   This shader simulates generation 1–8 via the u_generation uniform.
//
// References:
//   Poynton, C. (1996). A Technical Introduction to Digital Video. §12
//   Machin, I. (1992). "Generation Loss in Consumer VCRs." IBC Proceedings.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;      // 0–1 master
uniform float u_generation;     // 1–8 number of dubs (default: expose as 1–8)

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

// ── Per-generation degradation parameters ────────────────────────────────

// Noise power grows ~3 dB per generation (linear amplitude ×1.41 per gen)
float noisePower(float gen) {
    return min(pow(1.41, gen - 1.0) * 0.015, 0.25) * u_intensity;
}

// Resolution loss: bandwidth narrows with each dub (wider blur)
float blurRadius(float gen) {
    return (gen - 1.0) * 0.6 * u_intensity;   // pixels
}

// Chroma saturation fades with each dub
float chromaSaturation(float gen) {
    return max(0.0, 1.0 - (gen - 1.0) * 0.11 * u_intensity);
}

// Sync micro-jitter (scanline horizontal shift) accumulates
float syncJitter(vec2 uv, float gen, float t) {
    float lineNoise = noise(vec2(uv.y * 100.0, t * 20.0 + gen));
    return (lineNoise - 0.5) * (gen - 1.0) * 0.003 * u_intensity;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float gen = clamp(u_generation, 1.0, 8.0);

    // Apply horizontal sync jitter (scanline displacement)
    float jitter = syncJitter(uv, gen, u_time);
    vec2  jitteredUV = clamp(uv + vec2(jitter, 0.0), 0.0, 1.0);

    vec3 src = smpteBars(jitteredUV);

    // Horizontal blur = resolution loss per generation
    float bRadius = blurRadius(gen);
    if (bRadius > 0.01) {
        float dx = 1.0 / u_resolution.x;
        vec3 blurSum = src;
        float wSum   = 1.0;
        for (int i = 1; i <= 6; i++) {
            float fi = float(i);
            float w = exp(-fi * fi / (bRadius * bRadius + 0.001));
            blurSum += smpteBars(clamp(jitteredUV - vec2(fi * dx, 0), 0.0, 1.0)) * w;
            blurSum += smpteBars(clamp(jitteredUV + vec2(fi * dx, 0), 0.0, 1.0)) * w;
            wSum += 2.0 * w;
        }
        src = blurSum / wSum;
    }

    vec3 yuv = rgbToYUV(src);

    // Noise floor rise
    float np = noisePower(gen);
    float lumaGrain  = (noise(vec2(uv * u_resolution * 0.4 + u_time * 20.0)) - 0.5) * np * 2.0;
    float chromaGrainU = (noise(vec2(uv * u_resolution * 0.3 + u_time * 25.0 + 50.0)) - 0.5) * np;
    float chromaGrainV = (noise(vec2(uv * u_resolution * 0.3 + u_time * 25.0 + 150.0)) - 0.5) * np;

    yuv.r += lumaGrain;
    yuv.g += chromaGrainU;
    yuv.b += chromaGrainV;

    // Chroma saturation reduction
    float sat = chromaSaturation(gen);
    yuv.g = (yuv.g - 0.5) * sat + 0.5;
    yuv.b = (yuv.b - 0.5) * sat + 0.5;

    // Slight yellow-green hue shift of whites (tape oxide colour residue)
    float whiteness = yuv.r * (1.0 - length(vec2(yuv.g - 0.5, yuv.b - 0.5)) * 2.0);
    yuv.g += whiteness * 0.015 * (gen - 1.0) * u_intensity;
    yuv.b -= whiteness * 0.01 * (gen - 1.0) * u_intensity;

    vec3 color = yuvToRGB(yuv);

    // Scanlines become more visible in later generations
    float scanDepth = 0.02 + 0.04 * (gen - 1.0) / 7.0 * u_intensity;
    color -= sin(uv.y * u_resolution.y * 3.14159) * scanDepth;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
