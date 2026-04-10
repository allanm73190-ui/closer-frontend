# New Debrief / Edit Debrief

## Structure des zones
- Header avec retour, titre et CTA paramétrage (manager).
- Bloc informations appel.
- Sections d’évaluation (catégories questions).
- Notes sectionnelles (forces/faiblesses/améliorations).
- Sidebar score live (desktop) / bloc score prioritaire (mobile).

## Composants UI utilisés
- `Input`, `Textarea`, `Btn`, `Card`, `ScoreGauge`, `ClosedBadge`.
- `RadioGroup`, `CheckboxGroup`, `SectionNotes`, `CatCard`.
- `Radar` (aperçu compétences), `Icon`.

## Features
- Création et édition debrief.
- Score calculé en live.
- Gestion template debrief.
- Liaison facultative avec deal pipeline.
- Sauvegarde brouillon locale hors édition.
- Règle conditionnelle “Aucune objection” (masquage questions suivantes).

## États
- loading submit.
- validation erreur formulaire.
- succès création/édition.
- erreurs API (message toast + conservation saisie).

## Interactions
- toggles radio/checkbox.
- champs libres conditionnels sur réponses positives.
- CTA sauvegarde et navigation post-save.
- accès settings/debrief config selon rôle.

## Responsive attendu
- Desktop: formulaire + panneau score.
- Mobile: empilement vertical sans perte de contexte.

## Écarts mockup vs app actuelle
- Certaines sections métiers plus riches que le mockup statique.
- Densité encore variable sur quelques champs.

## Critères d’acceptation parité visuelle
- Formulaire lisible, aéré, sans lignes “plates”.
- Score live immédiatement visible.
- Aucun chevauchement des sections sur mobile.

