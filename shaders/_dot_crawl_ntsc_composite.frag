// _dot_crawl_ntsc_composite.frag
// Dot crawl — luma-chroma cross-talk, checkerboard pattern at colour edges
//
// Physical basis:
//   In composite NTSC, luma (Y) and chroma (C) share the same signal bandwidth
//   through frequency interleaving. A low-pass / notch filter at the decoder
//   separates them; no passive filter is ideal, so some chroma leaks into luma
//   and vice-versa. At luminance-to-colour transitions the chroma subcarrier
//   appears as a crawling checkerboard (the "colour fringe" or "dot crawl")
//   because the 3.58 MHz subcarrier aliases against the display's pixel grid.
//
//   The pattern moves one row per field (1/60 s NTSC) giving the characteristic
//   slow upward crawl.
//
// References:
//   Poynton, C. (2012). Digital Video and HD. §9 — Composite artifacts
//   Netravali & Haskell (1995). Digital Pictures. §4.2 — Cross-colour

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

// ── Helpers ───────────────────────────────────────────────────────────────

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

// Detect colour edges — where chroma changes rapidly
float chromaEdge(vec2 uv) {
    float dx = 1.0 / u_resolution.x;
    vec3 left  = rgbToYUV(smpteBars(uv - vec2(dx, 0.0)));
    vec3 right = rgbToYUV(smpteBars(uv + vec2(dx, 0.0)));
    // Edge strength is difference in chroma (UV channels)
    return length(left.gb - right.gb) * 8.0;
}

// ── Dot crawl synthesis ───────────────────────────────────────────────────
//
// The dot crawl pattern is a checkerboard at the subcarrier frequency (roughly
// one half-cycle per pixel at typical NTSC resolution) that moves upward at
// one row per field period.  We simulate by:
//   1. Generating the checkerboard at colour edges
//   2. Animating it at the field rate (30 fields/s upward)

vec3 dotCrawl(vec2 uv, float t, float edgeStrength) {
    float px = uv.x * u_resolution.x;
    float py = uv.y * u_resolution.y;

    // Crawl speed: 1 row per field = u_resolution.y rows per second
    float crawlY = py + t * 30.0;   // 30 rows/sec ≈ NTSC field rate

    // Checkerboard — alternates every pixel in X, every row in Y
    float checker = mod(floor(px) + floor(crawlY), 2.0);

    // Hue of the dot crawl follows the subcarrier phase
    float phase = px * 0.314159 + t * 22.5;   // ~3.58 MHz scaled
    vec2 chromaVec = vec2(cos(phase), sin(phase)) * 0.15 * u_intensity;

    // Only visible at chroma edges
    float mask = clamp(edgeStrength, 0.0, 1.0) * u_intensity;
    float crawlLuma = (checker * 2.0 - 1.0) * 0.08 * mask;

    return vec3(crawlLuma, chromaVec.x * mask, chromaVec.y * mask);
}

// Cross-luminance: chroma leaks into luma as a high-frequency shimmer
float crossLuma(vec2 uv, float t) {
    float px = uv.x * u_resolution.x;
    float py = uv.y * u_resolution.y;
    // High-frequency oscillation at ~subcarrier aliasing frequency
    return sin(px * 0.628318 + py * 0.314159 + t * 20.0) * 0.04 * u_intensity;
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    vec3 src  = smpteBars(uv);
    vec3 yuv  = rgbToYUV(src);
    float edge = chromaEdge(uv);

    // Add dot crawl to YUV
    vec3 crawlDelta = dotCrawl(uv, u_time, edge);
    yuv.r += crawlDelta.r;
    yuv.g += crawlDelta.g;
    yuv.b += crawlDelta.b;

    // Cross-luminance shimmer
    yuv.r += crossLuma(uv, u_time);

    vec3 color = yuvToRGB(yuv);

    // Very slight scanline interference to simulate composite display
    float scanline = 0.03 * sin(uv.y * u_resolution.y * 3.14159);
    color -= scanline;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
