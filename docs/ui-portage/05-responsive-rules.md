# Règles responsive et shell

## Breakpoints
- Desktop principal: `> 768px`
- Intermédiaire layout dense: `<= 1100px`
- Mobile: `<= 768px`

## Desktop
- Sidebar gauche fixe: `220px`
- Main: `margin-left: 220px`, header sticky
- Contenu: `cd-main-content` avec padding horizontal stable
- Grilles principales:
  - KPI: 4 colonnes
  - Sections: 2 ou 3 colonnes selon bloc

## Mobile
- Sidebar masquée
- Topbar mobile sticky (`cd-mobile-top`)
- Bottom nav fixe (`cd-mobile-bottom`)
- Contenu vertical (`cd-page-flow`)
- KPI en 2 colonnes
- Sections multi-colonnes basculent en 1 colonne

## Règles de comportement
- Aucun chevauchement header/main.
- Aucun bloc coupé derrière bottom nav mobile.
- Toutes les modales doivent rester scrollables en hauteur réduite.
- Les grilles doivent retomber en pile lisible sans overflow horizontal.

## Sticky/fixed
- Sidebar desktop fixe sur toute hauteur.
- Header desktop sticky en haut du contenu.
- Topbar mobile sticky.
- Bottom nav mobile fixed avec safe-area.

## Acceptance responsive
- iPhone (petit écran): actions principales accessibles sans collision.
- Tablet: pas de “trou” entre sidebar et contenu.
- Desktop large: contraste et densité conservés, pas d’effet “vide”.

