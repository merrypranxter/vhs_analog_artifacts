// _playback_fast_forward.frag
// VHS fast-forward scan — compressed frames, horizontal tear, speed stripes

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

    // Frames scroll downward at fast-forward speed (~20×)
    float scrollY = fract(uv.y - u_time * 0.5);

    // Two partial frames visible simultaneously, divided by a tear line
    float tearY    = fract(u_time * 0.3);
    float aboveTear = step(tearY, scrollY);

    float y1 = aboveTear > 0.5 ? fract(scrollY - tearY) : scrollY / tearY;
    float y2 = aboveTear > 0.5 ? fract(scrollY - tearY + 0.5) : scrollY;

    vec3 frame1 = smpteBars(vec2(uv.x, y1));
    vec3 frame2 = smpteBars(vec2(uv.x, y2));

    vec3 color = mix(frame2, frame1, aboveTear);

    // Speed stripes: bright horizontal lines at frame boundaries
    float stripePhase = fract(scrollY * 4.0);
    float stripe = smoothstep(0.03, 0.0, stripePhase) * 0.5 * u_intensity;
    color += vec3(stripe);

    // Horizontal tear distortion
    float tearDist = abs(scrollY - tearY);
    float tearMask = smoothstep(0.02, 0.0, tearDist);
    float tearJitter = (noise(vec2(uv.x * 100.0, u_time * 80.0)) - 0.5) * 0.04 * u_intensity;
    vec3 tearColor   = smpteBars(clamp(uv + vec2(tearJitter, 0.0), 0.0, 1.0));
    color = mix(color, tearColor, tearMask * 0.7);
    color += vec3(tearMask * 0.3 * u_intensity);

    // Noise
    float n = (noise(uv * u_resolution * 0.4 + u_time * 40.0) - 0.5) * 0.06 * u_intensity;
    color += n;

    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.015;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
