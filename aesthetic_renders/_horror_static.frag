// aesthetic_renders/_horror_static.frag
// Horror static — maximum dropout, noise, broken sync, nightmare aesthetic
//
// The horror static aesthetic: the image barely coheres. The tape is dying.
// Recognition flickers between noise and terror — the signal is failing to
// communicate something you're not sure you want to see.
//
// Stack (extreme intensity):
//   1. Broken sync — frame rolls, slips, splits
//   2. Dense dropout bands — large white noise regions
//   3. Chroma corruption — wild hue errors, rainbow chaos
//   4. RF snow — total white noise in signal-free regions
//   5. Crushing darkness — unstable gamma, unpredictable dark regions
//   6. Occasional image fragment — the ghost of recognition

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float hash1(float n) { return fract(sin(n) * 43758.5453); }

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

    // -- 1. Broken sync: frame slips vertically --
    float syncChaos = fbm(vec2(t * 0.4, 5.0)) * 2.0 - 1.0;
    float syncSlip  = syncChaos * 0.3 * u_intensity;
    // Occasional hard sync loss
    float hardLoss  = step(0.85, hash1(floor(t * 5.0)));
    syncSlip += hardLoss * 0.5 * u_intensity;

    float rolledY = fract(uv.y + syncSlip);
    vec2  baseUV  = vec2(uv.x, rolledY);

    // -- 2. Massive horizontal jitter per line --
    float lineJitter = (noise(vec2(rolledY * 200.0, t * 80.0)) - 0.5) * 0.12 * u_intensity;
    vec2  jUV        = clamp(baseUV + vec2(lineJitter, 0.0), 0.0, 1.0);

    // -- 3. Ghost of image (barely visible, flickering) --
    float imageVisible = max(0.0, 0.3 - u_intensity * 0.25);
    vec3 ghostImage    = smpteBars(jUV) * imageVisible;

    // -- 4. RF snow (white noise baseline) --
    float rfSnow = noise(uv * u_resolution * 0.4 + t * 200.0);
    vec3  color  = vec3(rfSnow) * u_intensity;

    // Mix in ghost image
    color = mix(color, ghostImage, 0.3);

    // -- 5. Dropout bands: intermittent white/dark noise bands --
    for (int i = 0; i < 5; i++) {
        float bandSeed = float(i) * 0.37 + t * 0.7 + float(i) * 1.13;
        float bandY    = hash1(floor(bandSeed));
        float bandW    = 0.02 + 0.08 * hash1(bandSeed + 50.0);
        float inBand   = smoothstep(bandW, 0.0, abs(uv.y - bandY));
        float bandNoise = noise(vec2(uv.x * 100.0 + float(i) * 200.0, t * 50.0));
        color = mix(color, vec3(bandNoise), inBand * 0.9 * u_intensity);
    }

    // -- 6. Chroma chaos: rainbow fragments --
    float chromaPhase = noise(vec2(uv.x * 20.0 + t * 15.0, uv.y * 10.0)) * 6.2832;
    vec3  chromaRainbow = 0.5 + 0.5 * cos(chromaPhase + vec3(0.0, 2.094, 4.189));
    float chromaMask  = step(0.6, noise(vec2(uv.x * 8.0, uv.y * 4.0 + t * 3.0)));
    color = mix(color, chromaRainbow, chromaMask * 0.6 * u_intensity);

    // -- 7. Dark crushing (unstable gamma, deep shadows) --
    float darkCrush = fbm(vec2(uv.x * 3.0, uv.y * 3.0 + t * 0.2));
    color *= 0.4 + darkCrush * 0.8;

    // -- 8. Occasional bright flash (head saturation spark) --
    float flashSeed = floor(t * 12.0);
    float flashProb = hash1(flashSeed * 0.137);
    if (flashProb > 0.88) {
        float flashY    = hash1(flashSeed * 0.271);
        float flashMask = smoothstep(0.015, 0.0, abs(uv.y - flashY));
        color += flashMask * 2.0 * u_intensity;
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
