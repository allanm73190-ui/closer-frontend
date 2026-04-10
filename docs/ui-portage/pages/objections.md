# Objections Library

## Structure des zones
- Hero page + KPI objections.
- Filtres type/tri.
- Liste des objection cards (collapsed/expanded).
- Détail stats + réponse type + variante IA.

## Composants UI utilisés
- `Card`, `Btn`, `Empty`, `Spinner`, `Icon`.
- `ObjectionCard` (header + contenu extensible).

## Features
- Agrégation objections depuis debriefs.
- Taux de closing par objection.
- Extraction meilleures réponses.
- Variante IA générée.

## États
- loading data.
- empty objections.
- erreur API objections/IA.

## Interactions
- filtre par type.
- expand/collapse card.
- génération/copie réponse.

## Responsive attendu
- Desktop: cards généreuses avec sections internes.
- Mobile: cards empilées lisibles sans surcharge.

## Écarts mockup vs app actuelle
- Niveau de détail statistiques parfois différent selon données réelles.

## Critères d’acceptation parité visuelle
- Impression de bibliothèque “vivante”, pas plate.
- Informations hiérarchisées (header -> stats -> actions).
- Bonne lisibilité des taux et counts.

