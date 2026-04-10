# Debrief Detail

## Structure des zones
- Header détail (retour, identité lead, métadonnées appel, actions).
- Zone score: gauge + radar + barres sections.
- Bloc IA (synthèse, génération/régénération).
- Bloc points forts/faiblesses/améliorations.
- Bloc commentaires équipe (si actif).

## Composants UI utilisés
- `ScoreGauge`, `ScoreBadge`, `ClosedBadge`, `Radar`, `SectionBars`.
- `AIAnalysisCard`, `CommentsSection`.
- `Btn`, `Card`, `Icon`.

## Features
- Lecture complète du debrief.
- Edition/suppression.
- Analyse IA déclenchable/auto.
- Export PDF.
- Gestion commentaires.

## États
- loading détail/IA/commentaires.
- vide IA (CTA lancer).
- erreurs API IA/commentaires.
- succès copy/regenerate.

## Interactions
- modifier, supprimer, exporter, écouter.
- génération IA et copie.
- publication/suppression commentaire.

## Responsive attendu
- Desktop: analytics visuelles côte à côte.
- Mobile: empilement clair score -> IA -> détails.

## Écarts mockup vs app actuelle
- Détails de contenu IA plus dynamiques que le mockup figé.
- Variantes export selon contexte de données.

## Critères d’acceptation parité visuelle
- Sections analytiques immédiatement compréhensibles.
- Synthèse IA propre, lisible, hiérarchisée.
- Actions principales visibles sans confusion.

