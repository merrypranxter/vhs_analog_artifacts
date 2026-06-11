// _luma_edge_enhancement.frag
// Luma edge enhancement and aperture correction overshoot
//
// Consumer VCRs apply aggressive aperture correction to compensate for
// bandwidth limiting. The result is over-sharpened edges with characteristic
// white halos (overshoot) and dark rings (undershoot). High settings
// produce "ringing" artefacts — multiple fading echoes of edges.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;
uniform float u_sharpness;   // 0=soft VHS, 1=maximum overshoot (8–12 dB)

float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i,             vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1,0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0,1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1,1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
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

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float dx = 1.0 / u_resolution.x;
    float sharp = u_sharpness * u_intensity;

    // 5-tap horizontal laplacian for edge detection
    float y0  = luminance(smpteBars(uv));
    float y1L = luminance(smpteBars(clamp(uv - vec2(dx,   0), 0.0, 1.0)));
    float y2L = luminance(smpteBars(clamp(uv - vec2(dx*2, 0), 0.0, 1.0)));
    float y1R = luminance(smpteBars(clamp(uv + vec2(dx,   0), 0.0, 1.0)));
    float y2R = luminance(smpteBars(clamp(uv + vec2(dx*2, 0), 0.0, 1.0)));

    // Second-order derivative (edge signal)
    float lap = y0 - 0.5 * (y1L + y1R);                 // 1st-order
    float lap2 = y0 - 0.25 * (y2L + y1L + y1R + y2R);  // 2nd-order (ringing)

    // Boost factor: consumer VCR = +6 dB, aggressive = +12 dB
    float boostDB = sharp * 12.0;
    float boost   = pow(10.0, boostDB / 20.0) - 1.0;

    vec3 color = smpteBars(uv);
    // Apply enhancement to luma only
    float enhancedY = y0 + lap * boost * 0.7 + lap2 * boost * 0.3;
    // Reconstruct: replace luma component
    vec3 grey  = vec3(y0);
    float sat   = 0.85;
    color = mix(grey, color, sat);  // slight sat reduction (VHS)
    float delta = enhancedY - y0;
    color += delta;

    // Ringing echo (second harmonic of overshoot)
    float echo1 = luminance(smpteBars(clamp(uv - vec2(dx * 3.0, 0), 0.0, 1.0)));
    float echoSignal = (y0 - echo1) * boost * 0.15;
    color += echoSignal;

    // Tape grain
    float grain = (noise(uv * u_resolution * 0.5 + u_time * 22.0) - 0.5) * 0.02 * u_intensity;
    color += grain;

    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.02;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
