# hardware_variants/

Hardware-specific degradation profiles and format shaders for different
analog video recording systems.

## Shader files

| File | Format | Description |
|------|--------|-------------|
| `_ntsc_artifacts.frag` | NTSC | Full NTSC composite signal: YIQ colour, 3.58 MHz subcarrier, dot crawl, phase noise |
| `_pal_artifacts.frag` | PAL | Full PAL composite: YUV, 4.43 MHz subcarrier, Hanover bars, 50 Hz hum |

## Hardware preset JSON files

| File | Format | Era | Horizontal resolution |
|------|--------|-----|----------------------|
| `hardware_vhs_consumer.json` | VHS SP | 1985–1998 | 240 TVL |
| `hardware_svhs_prosumer.json` | S-VHS SP | 1988–2002 | 400 TVL |
| `hardware_betamax_consumer.json` | Betamax Beta-I | 1975–2002 | 280 TVL |
| `hardware_umatic_professional.json` | U-matic Low Band | 1971–1995 | 260 TVL |
| `hardware_8mm_consumer.json` | Video8 | 1985–2007 | 240 TVL |

## Naming convention

- Shaders: `_[system]_artifacts.frag`
- Presets: `hardware_[format]_[quality].json`

## Choosing a hardware profile

| I want... | Use |
|-----------|-----|
| Classic home-movie VHS look | `hardware_vhs_consumer.json` |
| 1990s semi-pro shoot | `hardware_svhs_prosumer.json` |
| 1970s–80s news footage | `hardware_umatic_professional.json` |
| Birthday video camcorder | `hardware_8mm_consumer.json` |
| Better-quality VHS alternative | `hardware_betamax_consumer.json` |
