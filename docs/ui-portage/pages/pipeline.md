# Pipeline

## Structure des zones
- Hero avec KPIs pipeline.
- Boutons actions (nouveau lead, paramètres pipeline).
- Colonnes kanban desktop / accordéon mobile.
- LeadSheet (création/édition) en overlay.

## Composants UI utilisés
- `Card`, `Btn`, `Input`, `Textarea`, `Spinner`, `Empty`, `Icon`.
- `DealCard`, `DropColumn`, `AccordionColumn`, `LeadSheet`, `StatusBadge`.

## Features
- CRUD deals.
- Changement statut (drag/button workflow).
- Liaison deal <-> debrief.
- Champs prioritaires configurables.
- Anti-doublon attendu sur liaison debrief.

## États
- loading deals/config.
- empty pipeline.
- erreurs create/update/delete.
- succès sauvegarde/suppression.

## Interactions
- ouverture LeadSheet.
- sauvegarde/suppression lead.
- création debrief depuis lead.
- filtre closer (manager/admin).

## Responsive attendu
- Desktop: kanban horizontal lisible.
- Mobile: accordéon vertical par stage.

## Écarts mockup vs app actuelle
- Logique métier plus riche que la maquette statique.
- Densité des cards variable selon volume des champs.

## Critères d’acceptation parité visuelle
- Colonnes clairement segmentées par statut.
- Contraste tuiles/stages suffisant.
- LeadSheet net, non “écrasé” sur petits écrans.

