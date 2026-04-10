# Matrice des features (rôles x pages)

## Rôles
- `closer`: accès opérationnel individuel.
- `head_of_sales`: supervision équipe + configuration.
- `admin`: super-ensemble des droits manager.

## Features transverses
| Feature | closer | head_of_sales | admin | Notes |
|---|---|---|---|---|
| Auth cookie + session restore | Oui | Oui | Oui | `auth/index.jsx`, `apiFetch('/auth/me')` |
| Thème clair/sombre | Oui | Oui | Oui | `app-settings` |
| Notifications in-app | Oui | Oui | Oui | `/notifications` + badge topbar |
| Navigation shell desktop/mobile | Oui | Oui | Oui | Sidebar fixe + bottom nav |
| IA analyse debrief | Oui | Oui | Oui | détail debrief |
| Export PDF debrief | Oui | Oui | Oui | `PdfViewer` |

## Features page par page
| Page | closer | head_of_sales | admin | Capacités principales |
|---|---|---|---|---|
| Dashboard | Oui | Oui | Oui | KPI, tendances, derniers debriefs, pipeline mini, patterns |
| NewDebrief / EditDebrief | Oui | Oui | Oui | saisie sections, score live, notes, liaison deal |
| Detail | Oui | Oui | Oui | radar, barres sections, IA, commentaires, export |
| Débriefs (History) | Oui | Oui | Oui | recherche, filtres, pagination, ouverture détail/édition |
| Pipeline | Oui | Oui | Oui | kanban/accordion, LeadSheet, lien debrief |
| Objections | Oui | Oui | Oui | stats objections, variantes IA, réponses |
| Mon équipe (HOSPage) | Non | Oui | Oui | équipes, membres, objectifs, manager summary |
| Gamification | Oui | Oui | Oui | leaderboard, niveaux, badges, objectifs |
| Settings | Oui | Oui | Oui | compte, sécurité, templates, pipeline, intégrations |
| Benchmark | Oui | Oui | Oui | comparaison période, radar, patterns |
| Knowledge | Oui | Oui | Oui | snippets, filtres, qualité, réutilisation |
| PdfViewer | Oui | Oui | Oui | visualisation et impression/export |

## Features métier critiques à préserver
- Synchronisation `Debrief -> Dashboard` (KPI, dernières entrées).
- Synchronisation `Debrief <-> Pipeline` (liaison deal/debrief).
- Synchronisation `Pipeline -> Dashboard` (pipeline mini + KPIs).
- Synchronisation `Team/Manager -> Dashboard` pour rôle manager.
- Règles de scoring debrief (incluant conditions de masquage des questions).

## Endpoints frontend consommés (non exhaustif backend)
- `/auth/*`, `/debriefs*`, `/comments*`
- `/deals*`, `/pipeline-config`
- `/objections`, `/ai/*`, `/patterns`
- `/teams*`, `/objectives*`, `/action-plans*`
- `/gamification/*`
- `/app-settings`, `/debrief-config`, `/debrief-templates`
- `/notifications*`, `/integrations/*`

