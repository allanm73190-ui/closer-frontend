# Taxonomie des cards et blocs visuels

## Families de cards
| Type | Usage | Classe / primitive |
|---|---|---|
| Hero card | En-tête page, pitch et CTA | `cd-hero-card` |
| KPI card | métriques compactes | `cd-kpi-card` |
| Surface muted | sections secondaires | `cd-surface-muted` |
| Glass card standard | contenu principal | `Card` (`card()`) |
| Micro card list item | lignes listées (debrief/deal/pattern) | styles inline + `cardSm()` |
| Modal card | overlays action/form | `Modal` + styles dédiés |
| Sheet card pipeline | LeadSheet de création/édition | composant `LeadSheet` |

## Composants card métiers
- Debrief: `DebriefCard`, `ScoreGauge`, `ClosedBadge`, `ScoreBadge`, `QualityBadge`.
- Pipeline: `DealCard`, `DropColumn`, `AccordionColumn`, `StatusBadge`.
- Team: `TeamTile`, `MemberCard`, `ManagerCopilotCard`.
- Objections: `ObjectionCard`.
- Gamification: `GamCard`, `ObjectiveBanner`, `ActionPlanCard`.

## Variantes d’état
| État | Rendu attendu |
|---|---|
| normal | fond glass/panel, bordure soft |
| hover | border accent + légère translation |
| active | accent explicite, bordure/left border |
| selected | contraste renforcé, badge/outline |
| disabled | opacité réduite, curseur not-allowed |
| loading | spinner inline ou bloc |
| empty | `Empty` component |
| error | `AlertBox error` ou toast error |
| success | toast success + coloration positive |

## Badges
- Statut closing: `ClosedBadge` (`Closé` / `Non closé`).
- Score: `ScoreBadge`.
- Priorité/qualité: variantes warning/success/danger/info.
- Chips contextuels: `cd-chip`.

## Règles de hiérarchie visuelle
- Hero > KPI > sections métier > listes détaillées.
- Un seul accent dominant par bloc.
- Eviter l’empilement de 3 gradients concurrents dans la même zone.
- Séparer les blocs par respirations cohérentes (12/16/20 px).

