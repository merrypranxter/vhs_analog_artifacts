// _chroma_hue_error_ntsc.frag
// NTSC hue error — subcarrier phase drift causing systematic hue rotation
//
// NTSC is uniquely vulnerable to hue errors because the decoder uses the
// colorburst reference to determine colour phase. Any drift between the
// recorded subcarrier and the replay reference shifts ALL colours by a
// corresponding angle in the IQ plane. A 10° phase error shifts flesh tones
// noticeably toward green or magenta. This is why NTSC sets had a "hue" or
// "tint" knob — a manual phase correction absent from PAL sets.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;
uniform float u_hueShift;   // degrees of intentional hue shift (-180 to +180)

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

    vec3 src = smpteBars(uv);
    vec3 yiq = rgbToYIQ(src);

    // Static hue shift (intentional — the tint control)
    float staticAngle = u_hueShift * 0.01745329 * u_intensity; // degrees to radians
    // Slow drift (head amp temperature drift, ~±15° over minutes)
    float drift = sin(u_time * 0.05) * 0.26 * u_intensity;    // ±15°
    // Per-scanline jitter (subcarrier phase noise)
    float lineJitter = (noise(vec2(uv.y * 80.0, u_time * 3.0)) - 0.5) * 0.35 * u_intensity;

    float totalAngle = staticAngle + drift + lineJitter;
    float c = cos(totalAngle), s = sin(totalAngle);
    float i_ = yiq.g, q_ = yiq.b;
    yiq.g = c * i_ - s * q_;
    yiq.b = s * i_ + c * q_;

    vec3 color = yiqToRGB(yiq);
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
