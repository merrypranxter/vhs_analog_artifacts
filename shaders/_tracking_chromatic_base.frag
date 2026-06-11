// _tracking_chromatic_base.frag
// VHS analog artifacts: tracking error + chromatic aberration + composite noise
// Synthesizes NTSC composite video degradation

precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

// Input image (in real use, this is a video texture)
// For starter, we generate a test pattern

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Test pattern: color bars + moving text
vec3 testPattern(vec2 uv, float t) {
    // SMPTE color bars
    float barWidth = 1.0 / 7.0;
    float bar = floor(uv.x / barWidth);
    vec3 colors[7];
    colors[0] = vec3(0.75, 0.75, 0.75); // white
    colors[1] = vec3(0.75, 0.75, 0.0);   // yellow
    colors[2] = vec3(0.0, 0.75, 0.75);   // cyan
    colors[3] = vec3(0.0, 0.75, 0.0);    // green
    colors[4] = vec3(0.75, 0.0, 0.75);   // magenta
    colors[5] = vec3(0.75, 0.0, 0.0);    // red
    colors[6] = vec3(0.0, 0.0, 0.75);    // blue
    
    int idx = int(clamp(bar, 0.0, 6.0));
    vec3 color = colors[idx];
    
    // Add some "content" at bottom: scrolling text lines
    if (uv.y < 0.15) {
        float scroll = fract(t * 0.1 + uv.x * 2.0);
        color = mix(vec3(0.1), vec3(0.9), step(0.5, scroll));
    }
    
    return color;
}

// RGB to YUV conversion (BT.601)
vec3 rgbToYUV(vec3 rgb) {
    float y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    float u = -0.14713 * rgb.r - 0.28886 * rgb.g + 0.436 * rgb.b;
    float v = 0.615 * rgb.r - 0.51499 * rgb.g - 0.10001 * rgb.b;
    return vec3(y, u + 0.5, v + 0.5);
}

vec3 yuvToRGB(vec3 yuv) {
    float y = yuv.r;
    float u = yuv.g - 0.5;
    float v = yuv.b - 0.5;
    float r = y + 1.13983 * v;
    float g = y - 0.39465 * u - 0.58060 * v;
    float b = y + 2.03211 * u;
    return vec3(r, g, b);
}

// NTSC chroma subcarrier simulation
float chromaSubcarrier(vec2 uv, float t) {
    float freq = 80.0; // relative frequency
    return sin(uv.x * freq * 6.28318 + t * 10.0);
}

// VHS tracking error: horizontal band of noise
float trackingError(vec2 uv, float t) {
    float bandY = 0.3 + 0.1 * sin(t * 0.7);
    float band = smoothstep(0.05, 0.0, abs(uv.y - bandY));
    float noise = hash(vec2(uv.x * 100.0, t * 60.0));
    return band * noise;
}

// Dropout: random white noise bursts
float dropout(vec2 uv, float t) {
    float d = hash(vec2(floor(uv * 50.0) + floor(t * 30.0) * 7.0));
    return step(0.97, d) * 0.8;
}

// Chromatic aberration: channel misalignment
vec3 chromaticAberration(vec3 color, vec2 uv, float t) {
    float shift = 0.005 + 0.003 * sin(t * 0.5);
    // In real use, sample texture at offset UVs
    // Starter: simulate by shifting color channels
    vec3 shifted = color;
    shifted.r = mix(color.r, color.g, shift * 10.0); // fake shift
    shifted.b = mix(color.b, color.g, shift * 10.0);
    return shifted;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    
    // Source test pattern
    vec3 color = testPattern(uv, u_time);
    
    // Convert to YUV (composite video encoding)
    vec3 yuv = rgbToYUV(color);
    
    // Add chroma subcarrier interference
    float chromaNoise = chromaSubcarrier(uv, u_time) * 0.05;
    yuv.g += chromaNoise * 0.1;
    yuv.b += chromaNoise * 0.1;
    
    // Tracking error band
    float tracking = trackingError(uv, u_time);
    yuv.r += tracking * 0.3;
    yuv.g += tracking * 0.1;
    
    // Dropout noise
    float doNoise = dropout(uv, u_time);
    yuv.r += doNoise;
    yuv.g += doNoise * 0.5;
    
    // Convert back to RGB
    color = yuvToRGB(yuv);
    
    // Chromatic aberration
    color = chromaticAberration(color, uv, u_time);
    
    // Scanlines
    float scanline = sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
    color *= 0.9 + 0.1 * scanline;
    
    // Head switching pulse (bottom line)
    if (uv.y < 0.02) {
        color *= 0.7 + 0.3 * sin(u_time * 60.0);
    }
    
    // VHS color saturation reduction
    float saturation = 0.7;
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, saturation);
    
    // Add tape noise grain
    float grain = hash(uv * u_resolution + u_time * 100.0) * 0.05;
    color += grain;
    
    gl_FragColor = vec4(color, 1.0);
}
