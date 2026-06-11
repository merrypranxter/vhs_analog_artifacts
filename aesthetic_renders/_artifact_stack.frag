// aesthetic_renders/_artifact_stack.frag
// Artifact stack — 6+ degradation stages layered for maximum analog texture
//
// The full stack sequentially applies:
//   1. VHS bandwidth limiting (luma + chroma)
//   2. Tracking error (horizontal noise band)
//   3. Chromatic aberration (Y/C channel misalignment)
//   4. Dropout noise (white spikes)
//   5. Chroma phase noise (colour instability)
//   6. Generation loss accumulation (noise floor rise)
//   7. Luma aperture correction (edge ringing)
//   8. Scanlines + head switching
//   9. CRT vignette
//
// Each stage can be scaled via u_intensity.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // master: 0=clean, 1=maximum degradation

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
    float t = u_time;
    float fi = u_intensity;

    // ── Stage 1: VHS bandwidth limiting ──────────────────────────────────
    float dx = 1.0 / u_resolution.x;
    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // Luma: 3-tap blur
    float yL = rgbToYUV(smpteBars(clamp(uv-vec2(dx,0),0.,1.))).r;
    float yR = rgbToYUV(smpteBars(clamp(uv+vec2(dx,0),0.,1.))).r;
    yuv.r = mix(yuv.r, (yL + yuv.r + yR) / 3.0, 0.3 * fi);

    // Chroma: 9-tap blur
    float uSum = yuv.g, vSum = yuv.b, cW = 1.0;
    for (int k = 1; k <= 4; k++) {
        float w = exp(-float(k) * 0.3);
        vec3 cL = rgbToYUV(smpteBars(clamp(uv - vec2(float(k)*dx, 0), 0., 1.)));
        vec3 cR = rgbToYUV(smpteBars(clamp(uv + vec2(float(k)*dx, 0), 0., 1.)));
        uSum += (cL.g + cR.g) * w; vSum += (cL.b + cR.b) * w; cW += 2.0 * w;
    }
    yuv.g = mix(yuv.g, uSum / cW, 0.7 * fi);
    yuv.b = mix(yuv.b, vSum / cW, 0.7 * fi);

    // ── Stage 2: Tracking error band ─────────────────────────────────────
    float trackY   = 0.3 + 0.1 * sin(t * 0.7 + 1.5);
    float trackBand = smoothstep(0.06, 0.0, abs(uv.y - trackY));
    float trackNoise = noise(vec2(uv.x * 120.0, t * 60.0));
    yuv.r = mix(yuv.r, trackNoise, trackBand * 0.7 * fi);
    yuv.g = mix(yuv.g, 0.5 + trackNoise * 0.2, trackBand * 0.5 * fi);

    // ── Stage 3: Chromatic aberration ────────────────────────────────────
    float shift = 0.004 * fi;
    vec3 cR_shifted = smpteBars(clamp(uv + vec2(shift, 0.0), 0., 1.));
    vec3 cB_shifted = smpteBars(clamp(uv - vec2(shift, 0.0), 0., 1.));
    vec3 aberColor  = yuvToRGB(yuv);
    aberColor.r = mix(aberColor.r, cR_shifted.r, 0.4 * fi);
    aberColor.b = mix(aberColor.b, cB_shifted.b, 0.4 * fi);
    yuv = rgbToYUV(aberColor);

    // ── Stage 4: Dropout noise ────────────────────────────────────────────
    float drop = hash(vec2(floor(uv.x * u_resolution.x * 0.5),
                           floor(uv.y * u_resolution.y) + floor(t*30.0)*7.0));
    float doThresh = mix(0.993, 0.98, fi);
    if (drop > doThresh) {
        yuv.r = 1.0;
        yuv.g = 0.5;
        yuv.b = 0.5;
    }

    // ── Stage 5: Chroma phase noise ───────────────────────────────────────
    float pAngle = (noise(vec2(uv.y * 5.0, t * 2.5)) - 0.5) * 0.4 * fi;
    float cp = cos(pAngle), sp = sin(pAngle);
    float u_ = yuv.g - 0.5, v_ = yuv.b - 0.5;
    yuv.g = cp * u_ - sp * v_ + 0.5;
    yuv.b = sp * u_ + cp * v_ + 0.5;

    // ── Stage 6: Generation loss noise floor ──────────────────────────────
    float genNoise = (noise(uv * u_resolution * 0.4 + t * 18.0) - 0.5) * 0.04 * fi;
    yuv.r += genNoise;
    yuv.g += genNoise * 0.5;
    yuv.b += genNoise * 0.5;

    // ── Stage 7: Aperture correction ringing ─────────────────────────────
    float yc    = yuv.r;
    float yLL   = rgbToYUV(smpteBars(clamp(uv - vec2(dx*3., 0), 0., 1.))).r;
    float yRR   = rgbToYUV(smpteBars(clamp(uv + vec2(dx*3., 0), 0., 1.))).r;
    float hpY   = yc - 0.5*(yLL + yRR);
    yuv.r      += hpY * 1.5 * fi;

    vec3 color = yuvToRGB(yuv);

    // ── Stage 8: Head switching (bottom zone) + scanlines ────────────────
    if (uv.y > 0.95) {
        float hNoise = noise(vec2(uv.x * 180.0 + t * 300.0, uv.y * 80.0));
        color = mix(color, vec3(hNoise * 0.6), (uv.y - 0.95) * 20.0 * fi);
    }
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.03 * fi;

    // ── Stage 9: CRT vignette ─────────────────────────────────────────────
    vec2 vig = uv * 2.0 - 1.0;
    color *= 1.0 - dot(vig, vig) * 0.25 * fi;

    // Warm lift
    color += 0.03 * fi;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
