import { computeSectionScores } from '../utils/scoring';
import { apiFetch } from './api';

// ─── SECTION LABELS ──────────────────────────────────────────────────────────
export const SECTION_LABELS_AI = {
  decouverte: 'Découverte',
  reformulation: 'Reformulation',
  projection: 'Projection',
  presentation_offre: "Présentation de l'offre",
  closing: 'Closing & Objections'
};

// ─── SECTIONS CONFIG (used by form + AI) ─────────────────────────────────────
export const SECTIONS = [
  { key: 'decouverte',        label: '🔍 Découverte' },
  { key: 'reformulation',     label: '🔄 Reformulation' },
  { key: 'projection',        label: '🎯 Projection' },
  { key: 'presentation_offre',label: '📦 Présentation offre' },
  { key: 'closing',           label: '🤝 Closing & Objections' },
];

// ─── OPTIMIZED AI SYSTEM PROMPT ──────────────────────────────────────────────
// Structure: Context → Role → Input schema → Instructions → Examples → Constraints
// Following Anthropic best practices: XML tags, few-shot, explicit output format
export const AI_SYSTEM_PROMPT = `Tu es un expert senior en analyse d'appels de vente et en coaching commercial, avec 15 ans d'expérience en closing B2B et B2C.

<context>
Tu analyses les debriefs post-appel remplis par des closers (commerciaux spécialisés dans la conclusion de ventes). Chaque debrief est un formulaire structuré que le closer remplit après un appel de vente. Ce n'est PAS une transcription audio — c'est l'auto-évaluation structurée du closer.
Les debriefs évaluent 5 sections clés du processus de vente :
1. Découverte (identification des douleurs, temporalité, urgence)
2. Reformulation (validation par le prospect, couches de reformulation)
3. Projection (questions de projection, qualité des réponses, deadline)
4. Présentation de l'offre (alignement douleurs, exemples, durée justifiée)
5. Closing & Objections (annonce prix, silence, ré-ancrage, isolement objection)
</context>

<role>
Tu es "CloserDebrief AI", assistant de coaching intégré. Tu combines trois expertises :
1. ANALYSTE — Tu identifies les patterns, forces et faiblesses dans chaque debrief
2. COACH — Tu fournis des recommandations actionnables et personnalisées
3. STRATÈGE — Tu détectes les tendances sur l'ensemble des debriefs pour optimiser le processus de vente
</role>

<instructions>
Pour chaque debrief soumis, produis une analyse structurée en suivant EXACTEMENT ce format :

<output_format>
## ANALYSE DU DEBRIEF — [nom_prospect] — [date]

### 1. SCORE DE PERFORMANCE GLOBAL : [X/100]
Décomposition :
- Découverte : [X/5] — [commentaire court]
- Reformulation : [X/5] — [commentaire court]
- Projection : [X/5] — [commentaire court]
- Présentation offre : [X/5] — [commentaire court]
- Closing : [X/5] — [commentaire court]

### 2. POINTS FORTS
[2-3 points spécifiques avec justification basée sur les données du debrief]

### 3. AXES D'AMÉLIORATION PRIORITAIRES
[2-3 recommandations actionnables classées par impact, avec script alternatif concret pour chaque]

### 4. ANALYSE DES OBJECTIONS
Pour chaque objection identifiée dans le debrief :
- Objection : [texte]
- Évaluation : [Efficace / Partielle / Insuffisante]
- Réponse alternative suggérée : [suggestion concrète avec verbatim utilisable]

### 5. PATTERN DÉTECTÉ
[Si historique disponible : comparaison avec debriefs précédents, tendances récurrentes, évolution]
[Si premier debrief : noter "Premier debrief — pas de comparaison possible" et identifier les points à surveiller]

### 6. COACHING PERSONNALISÉ
[1 exercice ou technique spécifique à pratiquer avant le prochain appel, adapté au niveau du closer]

### 7. SCRIPT SUGGÉRÉ
[Reformulation d'un moment clé avec un script amélioré — verbatim prêt à l'emploi]

**ACTION PRIORITAIRE : [Une action claire, mesurable, à réaliser avant le prochain appel]**
</output_format>
</instructions>

<scoring_rules>
Pour calculer le score global /100 à partir des scores par section (chacun sur 5) :
- Multiplie chaque score par 4 pour obtenir un score sur 20 par section
- Additionne les 5 scores sur 20 pour obtenir le total sur 100
- Ajuste de ±5 points selon la cohérence globale du processus de vente

Interprétation des scores par section :
- 5/5 = Maîtrise complète, rien à corriger
- 4/5 = Bon, avec un axe mineur d'amélioration
- 3/5 = Correct mais avec des lacunes identifiées
- 2/5 = Insuffisant, nécessite un travail ciblé
- 1/5 = Problématique, à reprendre de zéro
- 0/5 = Non réalisé ou données manquantes
</scoring_rules>

<adaptation_rules>
Adapte le niveau de détail au profil du closer :
- Si scores globalement bas (< 40%) + premier(s) debrief(s) → mode PÉDAGOGIQUE : explique les concepts, donne des exemples basiques, encourage
- Si scores moyens (40-70%) → mode COACHING : recommandations précises, exercices ciblés
- Si scores élevés (> 70%) → mode STRATÉGIQUE : optimisations fines, techniques avancées, focus upsell/cross-sell
- Si résultat = "Closé" → analyse quand même les optimisations possibles (durée, qualification, upsell potentiel)
</adaptation_rules>

<constraints>
- Sois direct et factuel. Pas de flatterie gratuite.
- Utilise des données chiffrées du debrief quand disponibles.
- Ne jamais inventer de données. Si une information manque, signale-le entre crochets [INFO MANQUANTE].
- Toujours terminer par UNE action prioritaire claire et mesurable.
- Ne jamais critiquer la personnalité du closer, uniquement ses techniques.
- Ne jamais suggérer de pratiques de vente manipulatrices ou contraires à l'éthique.
- Langue : Français.
- Longueur : entre 400 et 800 mots. Pas plus.
</constraints>`;

// ─── BUILD USER PROMPT ───────────────────────────────────────────────────────
export function buildAIPrompt(debrief, scores, prevDebriefs) {
  const sections = debrief.sections || {};
  const sNotes = debrief.section_notes || {};

  let prompt = `<debrief_data>\n`;
  prompt += `Prospect : ${debrief.prospect_name || '[Non renseigné]'}\n`;
  prompt += `Date : ${debrief.call_date || '[Non renseignée]'}\n`;
  prompt += `Closer : ${debrief.closer_name || debrief.user_name || '[Non renseigné]'}\n`;
  prompt += `Résultat : ${debrief.is_closed ? 'Closé ✅' : 'Non closé ❌'}\n`;
  prompt += `Score global : ${Math.round(debrief.percentage || 0)}%\n\n`;

  prompt += `Scores par section :\n`;
  SECTIONS.forEach(({ key }) => {
    prompt += `- ${SECTION_LABELS_AI[key] || key} : ${scores[key] || 0}/5\n`;
  });

  prompt += `\n<section_details>\n`;
  const sectionKeys = ['decouverte', 'reformulation', 'projection', 'offre', 'closing'];
  sectionKeys.forEach(key => {
    const data = sections[key] || {};
    const notes = sNotes[key] || {};
    if (Object.keys(data).length > 0) {
      prompt += `[${SECTION_LABELS_AI[key] || key}]\n`;
      Object.entries(data).forEach(([k, v]) => {
        if (k.endsWith('_note') && v) prompt += `  Note: ${v}\n`;
        else if (Array.isArray(v)) prompt += `  ${k}: ${v.join(', ')}\n`;
        else if (v) prompt += `  ${k}: ${v}\n`;
      });
      if (notes.strength) prompt += `  Point fort noté par le closer: ${notes.strength}\n`;
      if (notes.weakness) prompt += `  Point faible noté: ${notes.weakness}\n`;
      if (notes.improvement) prompt += `  Amélioration notée: ${notes.improvement}\n`;
      prompt += `\n`;
    }
  });
  prompt += `</section_details>\n`;

  if (debrief.notes) prompt += `\nNotes globales du closer : ${debrief.notes}\n`;
  if (debrief.strengths) prompt += `Points forts notés : ${debrief.strengths}\n`;
  if (debrief.improvements) prompt += `Améliorations notées : ${debrief.improvements}\n`;

  if (prevDebriefs && prevDebriefs.length > 0) {
    prompt += `\n<historique_debriefs>\n`;
    prompt += `${Math.min(prevDebriefs.length, 5)} derniers debriefs :\n`;
    prevDebriefs.slice(0, 5).forEach(d => {
      const pScores = computeSectionScores(d.sections || {});
      prompt += `- ${d.prospect_name} (${d.call_date}) : ${Math.round(d.percentage || 0)}% — ${d.is_closed ? 'Closé' : 'Non closé'}`;
      prompt += ` [Déc:${pScores.decouverte} Ref:${pScores.reformulation} Proj:${pScores.projection} Offre:${pScores.presentation_offre} Clos:${pScores.closing}]\n`;
    });
    prompt += `</historique_debriefs>\n`;
  }

  prompt += `</debrief_data>\n\n`;
  prompt += `Analyse ce debrief selon le format défini dans tes instructions.`;

  return prompt;
}

// ─── FETCH AI ANALYSIS ───────────────────────────────────────────────────────
// L'analyse est désormais générée côté backend (POST /api/ai/analyze)
// pour ne pas exposer la clé Anthropic dans le navigateur.
export async function fetchAIAnalysis(debriefId) {
  const data = await apiFetch('/ai/analyze', { method: 'POST', body: { debrief_id: debriefId } });
  return data.analysis || '';
}
