# Settings

## Structure des zones
- Hero paramètres.
- Onglets/sections: compte, sécurité, templates debrief, pipeline, intégrations.
- Formulaires par bloc.
- Feedback success/error inline + toast.

## Composants UI utilisés
- `Card`, `Btn`, `Input`, `Textarea`, `AlertBox`, `Spinner`, `Icon`.
- Sous-sections: `AccountSettingsSection`, `AppPreferencesSection`, `DebriefTemplatesSection`, `PipelineSettingsSection`, `IntegrationsSection`.

## Features
- Profil utilisateur.
- Préférences app (thème, auto-AI).
- Paramétrage templates debrief.
- Paramétrage pipeline.
- Intégrations (Google Calendar, etc.).

## États
- loading settings.
- empty sections contextuelles.
- erreurs API patch/get.
- succès sauvegarde.

## Interactions
- changement onglet.
- sauvegarde section.
- connexion/reconnexion intégration.

## Responsive attendu
- Sections stack mobile.
- champs et CTA pleine largeur.

## Écarts mockup vs app actuelle
- Le mockup simplifie les réglages; l’app expose des paramètres fonctionnels réels.

## Critères d’acceptation parité visuelle
- Lisibilité forte sans sous-textes inutiles.
- Cohérence visuelle de toutes sections settings.
- Feedback utilisateur immédiat et non ambigu.

