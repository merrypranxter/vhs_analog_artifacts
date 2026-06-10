# degradation_models/

JSON configurations describing specific tape degradation states.
Each file maps to a set of `u_*` shader uniforms that reproduce
the described physical condition.

## Files

| File | Type | Severity | Description |
|------|------|----------|-------------|
| `degradation_dropout_moderate.json` | dropout | moderate | Well-used tape, 50–100 plays |
| `degradation_dropout_severe.json` | dropout | severe | Neglected/old tape, failing |
| `degradation_tape_wear_light.json` | tape wear | light | 20–50 plays, minor crease |
| `degradation_tape_wear_heavy.json` | tape wear | heavy | 200+ plays, multiple creases, oxide bands |
| `degradation_generation_loss_nth.json` | generation loss | gen 1–8 | Progressive dub degradation table |

## Using degradation configs

Each JSON contains:
- `parameters` — physical measurements for reference
- `shader_uniforms` — values to pass directly to the corresponding shader
- `reference_shader` — which `.frag` file implements this degradation
- `visual_description` — what to expect to see

Load the JSON, extract `shader_uniforms`, and set them as WebGL uniform values
before rendering.
