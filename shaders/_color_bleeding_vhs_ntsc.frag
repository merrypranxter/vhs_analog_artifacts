// _color_bleeding_vhs_ntsc.frag
// Colour bleeding — chroma bandwidth overflow, horizontal colour smear
//
// Physical basis:
//   VHS records chroma (colour) at a low "down-converted" subcarrier frequency
//   of approximately 629 kHz (versus NTSC's original 3.58 MHz). This is
//   drastically narrower than the luma bandwidth, meaning chroma has far less
//   horizontal resolution. Where a sharp colour boundary exists in the original
//   image, VHS renders it as a gradual smear extending to the right (and
//   slightly to the left) of the true edge. Highly saturated colours "bleed"
//   across neutral regions, and adjacent saturated hues mix into muddy intermediaries.
//
//   VHS also has lower dynamic range on the chroma signal; over-saturated
//   colours wrap around (saturation inversion) or clip, creating false colours
//   at peak saturation.
//
// References:
//   Inglis, A. F. (1990). Video Engineering. §11.3 — VHS chroma bandwidth
//   Poynton, C. (1996). A Technical Introduction to Digital Video. §12 — chroma bandwidth

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

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

// ── Chroma low-pass blur (simulates 629 kHz chroma bandwidth) ─────────────
//
// Implemented as a wide horizontal accumulation on the U and V channels.
// The impulse response of a 629 kHz LPF at NTSC resolution is about 14 pixels.

vec2 chromaBleed(vec2 uv) {
    float bleedPixels = mix(2.0, 18.0, u_intensity);
    float dx = 1.0 / u_resolution.x;
    vec2 uv_sum = vec2(0.0);
    float w_total = 0.0;

    for (int i = 0; i < 16; i++) {
        float offset = float(i) * bleedPixels / 16.0;
        // Exponential decay to the right — bleed trails off
        float w = exp(-float(i) * 0.25);
        vec2 sUV = clamp(uv - vec2(offset * dx, 0.0), 0.0, 1.0);
        vec3 c = smpteBars(sUV);
        vec3 yuv = rgbToYUV(c);
        uv_sum  += yuv.gb * w;
        w_total += w;
    }
    return uv_sum / w_total;
}

// ── Saturation clipping / inversion ──────────────────────────────────────
//
// When C amplitude exceeds VHS dynamic range, it wraps or clips.
// We model as soft saturation compression with slight inversion above 90%.

vec2 chromaSaturate(vec2 uv_chroma) {
    float u_ = uv_chroma.x - 0.5;
    float v_ = uv_chroma.y - 0.5;
    float sat = length(vec2(u_, v_));
    float maxSat = mix(0.45, 0.25, u_intensity);    // VHS clips earlier under stress
    if (sat > maxSat) {
        // Soft clip with slight inversion phase wrap
        float overshoot = (sat - maxSat) * 0.5;
        sat = maxSat - overshoot * 0.3;
        // Slight hue rotation at clip (false colour)
        float angle = overshoot * 3.0;
        float c = cos(angle), s = sin(angle);
        u_ = c * u_ - s * v_;
        v_ = s * u_ + c * v_;
    }
    return vec2(u_ / sat * min(sat, maxSat), v_ / sat * min(sat, maxSat)) + 0.5;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 src  = smpteBars(uv);
    vec3 yuv  = rgbToYUV(src);

    // Replace U/V with bled chroma
    vec2 bledChroma = chromaBleed(uv);
    yuv.gb = mix(yuv.gb, bledChroma, u_intensity);

    // Saturation clip / false colour at peak saturation
    yuv.gb = chromaSaturate(yuv.gb);

    // Chroma noise from down-converted subcarrier instability
    float chromaNoise = (noise(vec2(uv.x * 60.0 + u_time * 8.0, uv.y * 30.0)) - 0.5)
                        * 0.04 * u_intensity;
    yuv.g += chromaNoise;
    yuv.b -= chromaNoise * 0.7;

    // Vertical chroma spreading (inter-line cross-talk)
    float dy = 1.0 / u_resolution.y;
    vec3 above = smpteBars(uv - vec2(0.0, dy));
    vec3 below = smpteBars(uv + vec2(0.0, dy));
    vec3 yuvA  = rgbToYUV(above);
    vec3 yuvB  = rgbToYUV(below);
    yuv.g = mix(yuv.g, (yuvA.g + yuv.g + yuvB.g) / 3.0, 0.25 * u_intensity);
    yuv.b = mix(yuv.b, (yuvA.b + yuv.b + yuvB.b) / 3.0, 0.25 * u_intensity);

    vec3 color = yuvToRGB(yuv);

    // Scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
