# Dashboard HOS / Admin

## Structure des zones
- Hero card orientée pilotage équipe.
- KPI équipe (debriefs, score moyen, closing, pipeline actif).
- Évolution score + derniers appels.
- Blocs patterns, objections, pipeline mini.
- Accès rapides vers `HOSPage` et actions managériales.

## Composants UI utilisés
- `Card`, `Btn`, `Spinner`, `Chart`, `Icon`.
- Composants dashboard partagés avec variante manager.

## Features
- Vue consolidée supervision.
- Patterns critiques via `/patterns`.
- Pipeline agrégé via `/deals`.
- Navigation vers gestion équipe.

## États
- loading données globales.
- vide si pas de closers/debriefs.
- erreurs API non bloquantes avec fallback visuel.

## Interactions
- CTA “Mon équipe”.
- accès historique et pipeline.
- ouverture debriefs récents.

## Responsive attendu
- même logique que closer.
- lisibilité maintenue des KPI managériaux sur mobile.

## Écarts mockup vs app actuelle
- Bloc “review queue” mockup non isolé comme section dédiée.
- Certaines métriques manager sont rendues différemment du prototype statique.

## Critères d’acceptation parité visuelle
- Différenciation claire closer vs manager sans changer la grammaire.
- KPI et actions manager visibles au premier écran desktop.
- Rendu mobile propre sans surcharge.

