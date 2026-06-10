# shaders/

GLSL fragment shaders for real-time analog artifact synthesis. Each shader is self-contained and
targets WebGL 1.0 / GLSL ES 1.00 so it runs in Shadertoy, Three.js, or any WebGL canvas.

## Uniforms (standard across all shaders)

| Uniform         | Type    | Description                              |
|-----------------|---------|------------------------------------------|
| `u_time`        | float   | Elapsed seconds — drives all animation   |
| `u_resolution`  | vec2    | Viewport dimensions in pixels            |
| `u_intensity`   | float   | 0–1 master artifact strength             |
| `u_sampler`     | sampler2D | Input video / image texture (optional) |

## Artifact shaders

| File | Effect |
|------|--------|
| `_tracking_chromatic_base.frag` | Tracking error + chromatic aberration — master reference |
| `_dropout_vhs_ntsc.frag` | Tape dropout: white noise bursts, oxide defects |
| `_chrominance_noise_ntsc_composite.frag` | Chroma subcarrier instability, rainbow speckle |
| `_dot_crawl_ntsc_composite.frag` | Luma-chroma cross-talk checkerboard at color edges |
| `_head_switching_vhs_ntsc.frag` | Head changeover pulse, 4-field periodicity |
| `_luma_blooming_vhs_ntsc.frag` | Aperture correction overshoot, bright halos |
| `_color_bleeding_vhs_ntsc.frag` | Chroma bandwidth overflow, horizontal color smear |
| `_generation_loss_vhs_nth.frag` | Nth-generation duplication noise floor + detail erosion |
| `_tape_wear_vhs_physical.frag` | Crease flutter, oxide loss bands, physical deformation |
| `_thermal_color_vhs_analog.frag` | Temperature-dependent magnetization hue drift |
| `_rf_interference_ntsc_ghost.frag` | Broadcast bleed, ghosting, multipath echoes |
| `_pause_degradation_vhs_still.frag` | Still-frame head wear stripe, stretched tape damage |

## Naming convention

`_[artifact]_[system]_[variant].frag`
