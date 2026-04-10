# PDF Viewer (hors mockup, style dérivé strict)

## Structure des zones
- Header viewer (retour, actions export/impression).
- Canvas preview (mono ou multi-pages).
- Bloc métadonnées debrief.

## Composants UI utilisés
- `Card`, `Btn`, `Spinner`, `Icon`.
- Génération PDF client (`jsPDF` + rendu HTML).

## Features
- Prévisualisation export debrief.
- Impression/téléchargement.
- cohérence 2+ pages si contenu long.

## États
- loading rendu.
- erreur génération.
- succès ouverture/téléchargement.

## Interactions
- ouvrir depuis détail.
- imprimer / enregistrer PDF.
- retour vers détail.

## Responsive attendu
- viewer utilisable desktop prioritaire.
- fallback lisible mobile.

## Écarts mockup vs app actuelle
- Non présent dans mockup statique.
- Exigence de qualité documentaire supérieure à la simple preview.

## Critères d’acceptation parité visuelle
- rendu A4 stable, pagination propre.
- hiérarchie claire (header, synthèse, analytics).
- absence de répétitions et pages blanches indésirables.

