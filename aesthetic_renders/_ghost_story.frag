// aesthetic_renders/_ghost_story.frag
// Ghost story — multiple translucent echo layers, memory texture, temporal blur
//
// The ghost story aesthetic: the image is haunted by itself.
// Past moments bleed into the present — translucent echoes at different
// temporal offsets, like a tape that has been played so many times its
// own history has been magnetically imprinted into its surface.
//
// The medium is the memory. Every tape remembers every playback.
//
// Stack:
//   1. Primary image (slightly degraded baseline)
//   2. Echo layer 1: t-0.5s, 35% opacity, small X/Y offset
//   3. Echo layer 2: t-1.2s, 18% opacity, different offset
//   4. Echo layer 3: t-2.5s, 8% opacity, ghostly pale
//   5. Temporal motion blur (current frame averaged with ghost frames)
//   6. Desaturation with cool blue-grey tone (ghost palette)
//   7. Soft luma edge glow (presence at edges)

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

// Simulate a "past moment" by varying the UV sample
// (Since we have no history buffer, we use time-shifted noise to
//  warp the UV, approximating what a different frame looked like)
vec3 echoSample(vec2 uv, float timeOffset, float spatialOffset) {
    // Warp UV by time-offset noise (simulates temporal difference)
    float warpX = (noise(vec2(uv.y * 6.0, (u_time - timeOffset) * 2.0)) - 0.5) * 0.015;
    float warpY = (noise(vec2(uv.x * 6.0, (u_time - timeOffset) * 2.0 + 50.0)) - 0.5) * 0.008;
    vec2 echoUV = clamp(uv + vec2(spatialOffset + warpX, warpY), 0.0, 1.0);
    return smpteBars(echoUV);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time;

    // Primary image — mildly degraded
    vec3 primary = smpteBars(uv);
    vec3 yuv     = rgbToYUV(primary);

    // Slight chroma desaturation (worn tape)
    yuv.g = (yuv.g - 0.5) * 0.6 + 0.5;
    yuv.b = (yuv.b - 0.5) * 0.6 + 0.5;
    primary = yuvToRGB(yuv);

    // Echo layers (translucent past moments)
    vec3 echo1 = echoSample(uv, 0.5,  0.008 * u_intensity);
    vec3 echo2 = echoSample(uv, 1.2, -0.015 * u_intensity);
    vec3 echo3 = echoSample(uv, 2.5,  0.022 * u_intensity);

    // Desaturate echoes further (memories fade in colour)
    float e1lum = dot(echo1, vec3(0.299, 0.587, 0.114));
    float e2lum = dot(echo2, vec3(0.299, 0.587, 0.114));
    float e3lum = dot(echo3, vec3(0.299, 0.587, 0.114));
    echo1 = mix(echo1, vec3(e1lum), 0.4);
    echo2 = mix(echo2, vec3(e2lum), 0.7);
    echo3 = vec3(e3lum);   // fully desaturated ghost

    // Composite
    float i = u_intensity;
    vec3 color = primary * (1.0 - 0.15 * i)
               + echo1  * 0.35 * i
               + echo2  * 0.18 * i
               + echo3  * 0.08 * i;

    // Cool blue-grey ghost palette
    color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), 0.2 * i);
    color.b += 0.04 * i;
    color.r -= 0.02 * i;

    // Soft edge glow (presence at luma edges — ghost outlined in dim light)
    float dx = 1.0 / u_resolution.x;
    float edgeLum = abs(dot(smpteBars(uv + vec2(dx, 0.0)) - smpteBars(uv - vec2(dx, 0.0)),
                            vec3(0.299, 0.587, 0.114)));
    color += edgeLum * 0.3 * i * vec3(0.6, 0.7, 0.9);

    // Faint tape grain
    float grain = (noise(uv * u_resolution * 0.5 + t * 18.0) - 0.5) * 0.015 * i;
    color += grain;

    // Vignette
    vec2 vig = uv * 2.0 - 1.0;
    color *= 1.0 - dot(vig, vig) * 0.3 * i;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
