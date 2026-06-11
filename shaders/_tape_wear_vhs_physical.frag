// _tape_wear_vhs_physical.frag
// Physical tape wear — crease lines, oxide-loss bands, flutter deformation
//
// Physical basis:
//   Magnetic tape degrades through mechanical contact with the head drum, guides,
//   and capstan. Three dominant wear modes:
//
//   1. Crease damage: a fold or kink in the tape base creates a hard crease.
//      The crease causes the tape to part from the head momentarily (dropout) or
//      to press unevenly (noise band). Creases produce diagonal or horizontal
//      bright/dark lines of varying widths that persist at the same frame position.
//
//   2. Oxide shedding bands: long playback of the same tape section wears away
//      oxide particles over a horizontal band corresponding to the frequently
//      played portion of the helical scan track. Results in horizontal stripe of
//      increased noise and reduced signal.
//
//   3. Flutter / wave deformation: physical deformation of the tape base
//      (stretched, warped) causes time-base errors — the video image appears to
//      waver and breathe horizontally, more severe at scene changes.
//
// References:
//   Geller, L. et al. (2006). "Mechanical Wear of Magnetic Tape." JMST.
//   Van Bogart, J. (1995). Magnetic Tape Storage and Handling. CLIR.

precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_intensity;   // 0–1

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

// ── Crease lines ──────────────────────────────────────────────────────────
//
// Each crease is a persistent horizontal band with noisy brightness and
// slight horizontal displacement on adjacent lines.

struct Crease {
    float y;         // normalised vertical position
    float width;     // normalised width
    float phase;     // noise seed / phase offset
};

Crease makeCrease(float seed) {
    Crease c;
    c.y     = hash1(seed * 3.7 + 0.1);
    c.width = 0.003 + 0.012 * hash1(seed * 5.1);
    c.phase = seed * 17.3;
    return c;
}

float creaseEffect(vec2 uv, Crease cr, float t) {
    float d = abs(uv.y - cr.y);
    if (d > cr.width * 3.0) return 0.0;
    float mask = smoothstep(cr.width * 3.0, 0.0, d);
    float noiseVal = noise(vec2(uv.x * 60.0 + cr.phase, t * 0.3 + cr.phase));
    return mask * (noiseVal * 0.5 + 0.3);
}

// ── Oxide shedding bands ──────────────────────────────────────────────────

float oxideBand(vec2 uv, float t) {
    // One or two slow-drifting oxide-loss bands
    float bandY1 = 0.35 + 0.05 * sin(t * 0.07);
    float bandY2 = 0.72 + 0.03 * sin(t * 0.11 + 1.3);
    float w = 0.04;
    float band1 = smoothstep(w, 0.0, abs(uv.y - bandY1));
    float band2 = smoothstep(w * 0.5, 0.0, abs(uv.y - bandY2));
    float noiseA = noise(vec2(uv.x * 30.0 + t * 2.0, uv.y * 50.0));
    float noiseB = noise(vec2(uv.x * 50.0 + t * 1.5 + 200.0, uv.y * 50.0));
    return (band1 * noiseA + band2 * noiseB * 0.6) * u_intensity;
}

// ── Flutter / wave deformation ────────────────────────────────────────────
//
// Time-base error: the image breathes horizontally.
// Slow wave (wow) + fast ripple (flutter).

vec2 tapeDeformation(vec2 uv, float t) {
    float wow     = fbm(vec2(uv.y * 3.0, t * 0.5))     * 0.012 * u_intensity;
    float flutter = fbm(vec2(uv.y * 20.0, t * 6.0))    * 0.004 * u_intensity;
    float deform  = wow + flutter;
    return vec2(uv.x + deform, uv.y);
}

// ── Main ──────────────────────────────────────────────────────────────────

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // Apply tape deformation to UV before sampling
    vec2 warpedUV = tapeDeformation(uv, u_time);
    warpedUV = clamp(warpedUV, 0.0, 1.0);

    vec3 color = smpteBars(warpedUV);

    // Three crease lines with fixed seeds
    Crease c0 = makeCrease(0.0);
    Crease c1 = makeCrease(1.0);
    Crease c2 = makeCrease(2.0);

    float cr0 = creaseEffect(uv, c0, u_time) * u_intensity;
    float cr1 = creaseEffect(uv, c1, u_time) * u_intensity;
    float cr2 = creaseEffect(uv, c2, u_time) * u_intensity;

    // Crease: mix toward white noise (dropout inside crease)
    float creaseMax = max(max(cr0, cr1), cr2);
    color = mix(color, vec3(noise(uv * u_resolution + u_time * 40.0)), creaseMax * 0.8);
    color += vec3(creaseMax * 0.15);  // slight brightening at crease

    // Oxide bands: dark noisy stripe
    float oxide = oxideBand(uv, u_time);
    color = mix(color, vec3(noise(vec2(uv.x * 200.0 + u_time, uv.y * 30.0)) * 0.3), oxide * 0.6);
    color *= 1.0 - oxide * 0.5;

    // Scanlines
    color -= sin(uv.y * u_resolution.y * 3.14159) * 0.025;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
