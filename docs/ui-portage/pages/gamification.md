# Gamification

## Structure des zones
- Hero gamification (XP, niveau).
- Card progression niveau.
- Leaderboard.
- Grille badges.
- Objectifs / plans d’action liés.

## Composants UI utilisés
- `GamCard`, `ObjectiveBanner`, `ActionPlanCard`.
- `Card`, `Btn`, `Icon`, `Spinner`.

## Features
- Affichage points/niveaux/badges.
- Classement des closers.
- Objectifs périodiques.
- Plans d’action actifs/résolus.

## États
- loading gamification.
- empty classement.
- erreurs API gamification/objectifs.

## Interactions
- navigation vers détails objectifs.
- résolution plan d’action.

## Responsive attendu
- Bloc progression prioritaire mobile.
- leaderboard lisible sur petits écrans.

## Écarts mockup vs app actuelle
- Le mockup montre badges figés; l’app est data-driven.

## Critères d’acceptation parité visuelle
- Zone progression immédiatement identifiable.
- Contraste des badges et rangs.
- Aucune confusion entre score debrief et score XP.

