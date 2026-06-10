// aesthetic_renders/_nostalgia_filter.frag
// Nostalgia filter — curated combination of warm artifacts, gently degraded
//
// The nostalgia filter evokes a particular emotional texture: something watched
// many times on a well-maintained tape in a warm living room. The artifacts are
// present but never overwhelming — a slight tracking shimmer, warm chroma, the
// comfortable grain of a tape that has been played but not abused.
//
// Stack:
//   1. VHS bandwidth limiting (soft luma, chroma smear)
//   2. Warm colour temperature (YIQ I-axis boost, slight orange tint)
//   3. Gentle tracking shimmer (very low intensity)
//   4. Fine tape grain
//   5. Soft scanlines
//   6. Slight vignette (CRT curved screen edge darkening)
//   7. NTSC 7.5 IRE black level (lifted shadows)

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0=clean, 1=full nostalgia

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

vec3 rgbToYIQ(vec3 c) {
    return vec3(
        0.299  * c.r + 0.587  * c.g + 0.114  * c.b,
        0.5959 * c.r - 0.2746 * c.g - 0.3213 * c.b,
        0.2115 * c.r - 0.5227 * c.g + 0.3112 * c.b
    );
}

vec3 yiqToRGB(vec3 yiq) {
    return vec3(
        yiq.r + 0.9563 * yiq.g + 0.6210 * yiq.b,
        yiq.r - 0.2721 * yiq.g - 0.6474 * yiq.b,
        yiq.r - 1.1070 * yiq.g + 1.7046 * yiq.b
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
    float t = u_time;

    // -- 1. Soft chroma bleed (6px right bleed) --
    float dx = 1.0 / u_resolution.x;
    vec3 src = smpteBars(uv);

    vec3 bleedSum = src;
    float bw = 1.0;
    for (int i = 1; i <= 5; i++) {
        float w = exp(-float(i) * 0.4);
        bleedSum += smpteBars(clamp(uv - vec2(float(i) * dx, 0.0), 0.0, 1.0)) * w;
        bw += w;
    }
    vec3 bleedColor = bleedSum / bw;

    // -- 2. VHS bandwidth (blend toward blurred) --
    vec3 color = mix(src, bleedColor, 0.5 * u_intensity);

    // -- 3. Warm colour temperature in YIQ --
    vec3 yiq = rgbToYIQ(color);
    // I axis boost (+10%): more orange/amber = "warm tape" feeling
    yiq.g *= 1.0 + 0.10 * u_intensity;
    // Slight saturation lift
    float satScale = 1.0 + 0.08 * u_intensity;
    yiq.g *= satScale; yiq.b *= satScale;
    color = yiqToRGB(yiq);

    // -- 4. Gentle tracking shimmer (barely perceptible) --
    float trackingWave = sin(uv.y * 8.0 + t * 1.2) * 0.003 * u_intensity;
    vec2 trackUV = clamp(uv + vec2(trackingWave, 0.0), 0.0, 1.0);
    color = mix(color, smpteBars(trackUV), 0.2 * u_intensity);

    // -- 5. Fine tape grain --
    float grain = (noise(uv * u_resolution * 0.6 + t * 20.0) - 0.5) * 0.022 * u_intensity;
    color += grain;

    // -- 6. Soft scanlines --
    float scan = sin(uv.y * u_resolution.y * 3.14159) * 0.03 * u_intensity;
    color -= scan;

    // -- 7. CRT vignette --
    vec2 vig = uv * 2.0 - 1.0;
    float vignette = 1.0 - dot(vig, vig) * 0.25 * u_intensity;
    color *= vignette;

    // -- 8. NTSC 7.5 IRE lifted black (shadows never go fully black) --
    float liftAmount = 0.04 * u_intensity;
    color = color * (1.0 - liftAmount) + liftAmount;

    // -- 9. Warm amber highlight tint --
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 warmTint = vec3(0.025, 0.008, -0.015) * u_intensity;
    color += warmTint * lum;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
