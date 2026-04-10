# Dashboard Closer

## Structure des zones
- Header de page (titre, actions rapides).
- Hero card (kicker, salutation, chips de synthèse, CTA).
- Grille KPI (4 cards desktop, 2 mobile).
- Bloc évolution du score.
- Bloc derniers appels debriefés.
- Blocs progression, objections fréquentes, pipeline mini.

## Composants UI utilisés
- `Card`, `Btn`, `Spinner`, `Empty`, `ClosedBadge`, `Chart`.
- `DebriefCard` (ou rendu compact équivalent).
- `Icon` (Lucide) pour tous pictos.

## Features
- Vue synthèse performance individuelle.
- Accès rapide vers `NewDebrief`, `History`, `Pipeline`.
- KPIs calculés à partir des debriefs et deals.
- Mise à jour pipeline via polling + event `cd:deals-updated`.

## États
- loading: spinner bloc.
- empty debrief: état vide explicite.
- empty pipeline: état vide explicite.
- success: affichage données consolidées.
- error API: fallback silencieux + données partielles.

## Interactions
- CTA nouveau debrief.
- Navigation vers historique.
- Ouverture détail depuis derniers debriefs.
- Ouverture pipeline depuis mini pipeline.

## Responsive attendu
- Desktop: sections en grilles 2/3 colonnes.
- Mobile: pile verticale, KPI 2 colonnes, CTA accessibles.

## Écarts mockup vs app actuelle
- Typo/espacements encore hétérogènes sur certains sous-blocs.
- Certaines cards ont un style plus “app” que “mockup strict”.

## Critères d’acceptation parité visuelle
- Hiérarchie identique mockup (Hero > KPI > sections).
- Contraste net entre blocs.
- Aucune collision entre cards et aucun débordement mobile.
- Icônes Lucide cohérentes partout.

