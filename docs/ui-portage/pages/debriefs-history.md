# Débriefs / History

## Structure des zones
- Hero page avec compteur global.
- Barre recherche + filtres + pagination.
- Liste des debrief cards.
- Actions contextuelles (ouvrir/éditer).

## Composants UI utilisés
- `Input`, `Btn`, `Card`, `Empty`, `DebriefCard`, `Icon`.

## Features
- Recherche full-text (prospect/closer/auteur).
- Filtres période et score.
- Pagination client.
- Ouverture détail et édition.

## États
- loading (si fetch côté page).
- empty résultat.
- empty global sans debrief.
- erreur API récup debrief.

## Interactions
- saisie recherche.
- clear filtres.
- clic card vers détail.
- CTA nouveau debrief.

## Responsive attendu
- Liste compacte lisible mobile.
- Toolbar filtres wrap sans collision.

## Écarts mockup vs app actuelle
- Le mockup présente une table plus statique, l’app intègre filtres réels.

## Critères d’acceptation parité visuelle
- Cartes homogènes et contrastées.
- Navigation list -> détail fluide.
- Contrôle de densité vertical conforme mockup.

