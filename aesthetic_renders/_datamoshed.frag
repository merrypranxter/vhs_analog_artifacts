// aesthetic_renders/_datamoshed.frag
// Datamosh — intra-frame corruption + analog artifacts hybrid
//
// Datamoshing is a digital video artifact caused by discarding or corrupting
// the I-frames (intra-coded frames) in compressed video (H.264, MPEG), so that
// motion vectors from P-frames or B-frames are applied without a reference frame.
// The result: motion information without image update — pixels smear and stretch
// in the direction of prior motion, creating a painterly corrupted aesthetic.
//
// This shader synthesises a datamosh-like effect and combines it with analog
// VHS artifacts — the impossible hybrid of a VHS tape that has also been through
// a codec encoder. The tape doesn't understand macroblocks; the codec doesn't
// understand tracking noise. The result is uniquely uncanny.
//
// Stack:
//   1. Simulated motion vector displacement (UV warping)
//   2. I-frame corruption: regions of frozen/smeared pixels
//   3. Macroblock boundary artefacts
//   4. VHS chroma noise and tracking errors over the digital corruption
//   5. Interlacing artifacts (field misalignment)

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;

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

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;
    float fi = u_intensity;

    // -- Macroblock grid (16×16 px MPEG blocks) --
    vec2 blockSize = vec2(16.0) / u_resolution;
    vec2 blockUV   = floor(uv / blockSize) * blockSize;
    vec2 blockFrac = fract(uv / blockSize);

    // -- I-frame corruption: each block may be "frozen" at a different time --
    float blockSeed    = hash(blockUV * u_resolution / 16.0);
    float blockAge     = floor(t * 2.0) + hash1(blockSeed * 1000.0) * 10.0;
    float frozenPhase  = floor(blockAge * hash1(blockSeed * 500.0 + 1.0));
    float iFrameCorrupt = step(0.4 * fi, hash1(frozenPhase * 0.033 + blockSeed));

    // -- Motion vector displacement (P-frame smear) --
    // Accumulated motion since last I-frame
    float motionX = fbm(blockUV * 4.0 + frozenPhase * 0.17) * 2.0 - 1.0;
    float motionY = fbm(blockUV * 4.0 + frozenPhase * 0.23 + 5.0) * 2.0 - 1.0;
    vec2 motionVec = vec2(motionX, motionY) * 0.15 * fi * iFrameCorrupt;

    // Apply displacement
    vec2 warpedUV = clamp(uv + motionVec, 0.0, 1.0);

    // -- Macroblock boundaries: visible block edges on corrupted regions --
    float edgeX = smoothstep(0.0, 0.02, blockFrac.x) * smoothstep(1.0, 0.98, blockFrac.x);
    float edgeY = smoothstep(0.0, 0.02, blockFrac.y) * smoothstep(1.0, 0.98, blockFrac.y);
    float blockEdge = (1.0 - edgeX * edgeY) * iFrameCorrupt * 0.15 * fi;

    vec3 src   = smpteBars(warpedUV);
    vec3 color = src;

    // Macroblock posterisation (quantisation artefact)
    float quantSteps = mix(256.0, 8.0, iFrameCorrupt * fi);
    color = floor(color * quantSteps) / quantSteps;

    // Block edge darkening
    color *= (1.0 - blockEdge);

    // -- VHS analog layer over digital corruption --
    vec3 yuv = rgbToYUV(color);

    // Chroma phase noise
    float pAngle = (noise(vec2(uv.y * 4.0, t * 2.0)) - 0.5) * 0.5 * fi;
    float cp = cos(pAngle), sp = sin(pAngle);
    float u_ = yuv.g - 0.5, v_ = yuv.b - 0.5;
    yuv.g = cp * u_ - sp * v_ + 0.5;
    yuv.b = sp * u_ + cp * v_ + 0.5;

    // Dropout spikes
    float drop = hash(vec2(uv.x * 300.0 + t * 200.0, uv.y * 200.0));
    if (drop > 0.97) { yuv.r = 1.0; yuv.g = 0.5; }

    // Tracking band
    float trackY = 0.4 + 0.15 * sin(t * 0.5);
    float trackMask = smoothstep(0.04, 0.0, abs(uv.y - trackY));
    yuv.r = mix(yuv.r, noise(vec2(uv.x * 80.0, t * 40.0)), trackMask * 0.6 * fi);

    color = yuvToRGB(yuv);

    // Interlace field offset
    float line = floor(uv.y * u_resolution.y);
    float field = mod(floor(t * 30.0), 2.0);
    color *= 1.0 - mod(line + field, 2.0) * 0.04 * fi;

    // Scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025 * fi;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
