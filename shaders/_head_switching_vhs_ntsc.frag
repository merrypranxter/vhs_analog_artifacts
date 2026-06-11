// _head_switching_vhs_ntsc.frag
// VHS head-switching artifact — noise pulse at the bottom of frame
//
// Physical basis:
//   A VHS recorder uses two video heads mounted 180° apart on a spinning drum.
//   Each head writes/reads one field (half the frame). At the head changeover
//   point (the "head-switching moment"), the servo system briefly loses lock
//   before the new head stabilises. The transition appears as a horizontal
//   distortion band at the bottom of the frame (approximately the last 4-8% of
//   active video). The disturbance repeats every four fields (~133 ms) because
//   NTSC interlaced video requires four fields for one complete servo cycle.
//
//   The artefact is most visible on consumer decks without TBC (time-base
//   correction). Better decks suppress it with a head-switching suppressor pulse.
//
// References:
//   Poynton, C. (1996). A Technical Introduction to Digital Video. §13 — VHS
//   Inglis, A. F. (1990). Video Engineering. §14.4 — Head switching

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i),             hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
    );
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

// ── Head switching zone ───────────────────────────────────────────────────

// Zone height as fraction of frame — typically bottom 4-8%
const float HS_ZONE_TOP    = 0.94;   // switching starts here (from bottom)
const float HS_ZONE_BOTTOM = 1.00;

// 4-field servo cycle period (4 fields × 1/60 s = ~66.7 ms)
const float SERVO_PERIOD = 0.0667;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 src = smpteBars(uv);
    vec3 yuv = rgbToYUV(src);

    // Is this pixel inside the head-switching zone?
    float inZone = step(HS_ZONE_TOP, uv.y);

    if (inZone > 0.5) {
        // Phase within the 4-field servo cycle
        float servoPhase = mod(u_time, SERVO_PERIOD) / SERVO_PERIOD;

        // Relative depth inside the zone
        float zoneDepth = (uv.y - HS_ZONE_TOP) / (HS_ZONE_BOTTOM - HS_ZONE_TOP);

        // Horizontal sync displacement — the image shifts left/right erratically
        float syncJitter = (noise(vec2(zoneDepth * 20.0, u_time * 40.0)) - 0.5)
                           * 0.08 * u_intensity;

        // Brightness instability — briefly goes dark then flashes
        float lumaFlash  = noise(vec2(zoneDepth * 10.0 + servoPhase * 50.0,
                                      u_time * 60.0));
        float lumaDark   = 1.0 - zoneDepth * 0.8 * u_intensity;

        // Chroma completely lost in worst part
        float chromaLoss = zoneDepth * u_intensity;

        // Displaced source sample
        vec2 dispUV = uv + vec2(syncJitter, 0.0);
        dispUV = clamp(dispUV, 0.0, 1.0);
        vec3 dispSrc = smpteBars(dispUV);
        vec3 dispYUV = rgbToYUV(dispSrc);

        yuv = mix(yuv, dispYUV, 0.6 * u_intensity);

        // Luma flash at exact switch moment
        yuv.r = mix(yuv.r * lumaDark, lumaFlash, 0.3 * u_intensity);

        // Chroma collapses to neutral
        yuv.g = mix(yuv.g, 0.5, chromaLoss);
        yuv.b = mix(yuv.b, 0.5, chromaLoss);

        // Fast horizontal noise bursts
        float hNoise = hash(vec2(uv.x * 200.0 + u_time * 300.0,
                                  uv.y * 100.0));
        yuv.r += (hNoise - 0.5) * 0.4 * zoneDepth * u_intensity;
    }

    // Faint switching line: thin bright stripe at the top of the zone
    float switchLine = smoothstep(0.005, 0.0, abs(uv.y - HS_ZONE_TOP));
    float lineFlash  = 0.5 + 0.5 * sin(u_time * 188.5);  // 30 Hz flicker
    yuv.r += switchLine * lineFlash * 0.4 * u_intensity;

    vec3 color = yuvToRGB(yuv);

    // Scanlines
    float scanline = sin(uv.y * u_resolution.y * 3.14159) * 0.03;
    color -= scanline;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
