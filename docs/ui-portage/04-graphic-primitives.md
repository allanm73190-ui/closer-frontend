# Primitives graphiques

## Palette et tokens
- Primary accent: `#FF7E5F`
- Secondary accent: `#FEB47B`
- Accent violet: `#7C3AED`
- Texte principal: `#3A2418`
- Texte secondaire: `#7A5040`
- Texte muted: `#9A7A6A`
- Fond app: gradient sunrise (light) / gradient deep warm (dark)

Source: `src/styles/designSystem.js`

## Typographie
- Headings: `Manrope`
- Body/UI: `Inter`
- Hiérarchie:
  - Hero title: 21–26
  - Page title: 20–22
  - KPI value: 22–28
  - Body: 12–14
  - Labels/kickers: 9–11 uppercase tracking

## Rayons et ombres
- Radius Sm: 8
- Radius Md: 12
- Radius Lg: 14
- Radius Full: 999
- Ombres glass: `SH_CARD`, `SH_SM`
- Ombres bouton: `SH_BTN`
- Inset inputs: `SH_IN`

## Surfaces
- `--card`, `--card-soft`, `--glass-bg`, `--glass-border`
- Panneaux: `--panel-1`, `--panel-2`, `--panel-3`
- Chips: `--chip-bg`

## Boutons
- `primary`: gradient accent
- `secondary`: glass + border soft
- `danger`: fond rouge faible + texte danger
- `ghost`: fond transparent
- `green`: fond positif

## Inputs
- Fond sable/glass selon contexte
- Bordure soft + focus ring accent
- Radius 8-10
- Placeholder muted

## Data viz
- Chart trend (bars/line) sobre
- Radar 5 axes
- SectionBars horizontales comparatives
- Gauge score circulaire

## Navigation
- Sidebar fixe 220 px desktop
- Header sticky avec actions globales
- Bottom nav mobile fixe arrondie

## Règles dark mode
- Aucun texte sombre sur fond sombre.
- Contraste minimum lisible sur badges et CTA.
- Maintenir gradient de marque en mode dark sans saturation excessive.

