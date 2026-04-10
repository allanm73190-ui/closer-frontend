# Registre d’icônes

## Standard retenu
- Librairie: `lucide-react`
- Point d’entrée unique: `src/components/ui/Icon.jsx`
- Règle: aucune icône inline hors registre pour le shell et les pages portées.

## Set mockup (inventaire complet)
`arrow-left`, `arrow-right`, `award`, `bar-chart-2`, `bell`, `bot`, `calendar`, `check`, `check-circle`, `chevron-down`, `chevron-left`, `chevron-right`, `clipboard-check`, `copy`, `euro`, `eye`, `file-down`, `file-text`, `info`, `kanban`, `layout-dashboard`, `lock`, `log-in`, `log-out`, `message-square`, `message-square-warning`, `minus`, `pencil`, `play`, `plus`, `plus-circle`, `route`, `save`, `settings`, `shield-check`, `sliders`, `sparkles`, `target`, `thumbs-up`, `trending-up`, `trophy`, `upload`, `user`, `user-plus`, `users`, `x`, `zap`.

## Aliases legacy supportés
- `dashboard` -> `layout-dashboard`
- `analytics` -> `kanban`
- `forum` -> `message-square`
- `description` -> `file-text`
- `groups` -> `users`
- `emoji_events` -> `trophy`
- `query_stats` -> `bar-chart-2`
- `library_books` -> `book-open`
- `notifications` -> `bell`
- `logout` -> `log-out`
- `local_fire_department` -> `flame`
- `timeline` -> `activity`
- `psychology` -> `brain`
- `light_mode` -> `sun`
- `dark_mode` -> `moon`

## Règles d’usage
- Utiliser `<Icon name="..."/>` pour tous les pictos UI.
- Ne plus utiliser `material-symbols-outlined`.
- Centraliser toute nouvelle icône dans `Icon.jsx` avant usage.
- Garder les tailles 16/18/20/24/30 selon importance.

## Contrôles qualité
- `rg "material-symbols-outlined"` doit retourner 0 résultat.
- Les clés utilisées dans l’app doivent exister dans `ICON_MAP`.
- Contraste icône/fond conforme thème light et dark.

