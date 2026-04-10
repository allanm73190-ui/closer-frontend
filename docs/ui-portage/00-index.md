# Portage UI 1:1 — Index global

## Objectif
Porter strictement le rendu du mockup vers l’application React en conservant toute la logique métier existante.

## Sources de vérité
- Mockup HTML: `/Users/al/Documents/Playground/closerdebrief-mockups.html`
- Frontend cible: `/Users/al/Documents/Playground/closer-frontend-hardening/src`
- Shell app: `/Users/al/Documents/Playground/closer-frontend-hardening/src/App.jsx`
- Design tokens: `/Users/al/Documents/Playground/closer-frontend-hardening/src/styles/designSystem.js`

## Mapping mockup -> pages React
| Mockup ID | Navigation mockup | Page React | Composant cible |
|---|---|---|---|
| `page-dashboard` | Dashboard | `Dashboard` | `components/dashboard/index.jsx` (`Dashboard`) |
| `page-dashboard-hos` | Dashboard HOS | `Dashboard` (manager mode) | `components/dashboard/index.jsx` (`Dashboard`, `isManager`) |
| `page-new-debrief` | Nouveau debrief | `NewDebrief` | `components/debrief/NewDebrief.jsx` |
| `page-debrief-detail` | Détail | `Detail` | `components/debrief/Detail.jsx` |
| `page-debriefs` | Débriefs | `History` | `components/dashboard/index.jsx` (`History`) |
| `page-pipeline` | Pipeline | `Pipeline` | `components/pipeline/index.jsx` |
| `page-objections` | Objections | `Objections` | `components/objections/index.jsx` |
| `page-team` | Mon équipe | `HOSPage` | `components/team/index.jsx` |
| `page-gamification` | Classement | `Gamification` | `components/gamification/index.jsx` |
| `page-settings` | Paramètres | `Settings` | `components/settings/index.jsx` |

## Pages hors mockup (style dérivé strict)
- `Benchmark` -> `components/features/Benchmark.jsx`
- `Knowledge` -> `components/features/Knowledge.jsx`
- `PdfViewer` -> `components/debrief/PdfViewer.jsx`

## Dossiers de cadrage
- `01-features-matrix.md` -> features fonctionnelles par rôle/page
- `02-icons-registry.md` -> registre Lucide + mapping legacy
- `03-cards-taxonomy.md` -> cards et états visuels
- `04-graphic-primitives.md` -> tokens et primitives UI
- `05-responsive-rules.md` -> règles responsive/shell
- `pages/*.md` -> contrat de portage page par page

## Règles de portage
- Portage visuel strict 1:1 sur les pages mockup.
- Portage visuel strict dérivé sur les pages hors mockup.
- Auth visuelle conservée.
- Aucun breaking change API.
- Icônes unifiées via `lucide-react` et registre central.

