// ─── DESIGN SYSTEM — Sunrise Gradient ────────────────────────────────────────
// Drop-in replacement: every export name is preserved for backward compat.

// ─── Primary Palette ─────────────────────────────────────────────────────────
export const P  = '#FF7E5F';          // primary — warm coral-orange
export const P2 = '#FEB47B';          // primary gradient end — peach
export const A  = '#7C3AED';          // accent — violet
export const BG = 'linear-gradient(150deg,#FFF5EB 0%,#FDE8E8 35%,#EDE4F5 75%,#E4EEF8 100%)';
export const WHITE = '#ffffff';
export const TXT  = '#4A3428';        // text primary — warm dark brown
export const TXT2 = '#B09080';        // text secondary
export const TXT3 = '#C8B8A8';        // text muted
export const SAND = '#FFF8F3';        // input background

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const SH_CARD    = '0 8px 32px rgba(74,52,40,.08), inset 0 1px 0 rgba(255,255,255,.8)';
export const SH_SM      = '0 4px 16px rgba(74,52,40,.06), inset 0 1px 0 rgba(255,255,255,.7)';
export const SH_BTN     = '0 6px 20px rgba(255,126,95,.28), inset 0 1px 0 rgba(255,255,255,.2)';
export const SH_IN      = 'inset 1px 1px 4px rgba(200,160,140,.12), inset -1px -1px 4px rgba(255,255,255,.7)';
export const SH_HOVERED = '0 12px 36px rgba(74,52,40,.12), inset 0 1px 0 rgba(255,255,255,.85)';

// ─── Border Radius ───────────────────────────────────────────────────────────
export const R_SM   = 8;
export const R_MD   = 12;
export const R_LG   = 14;
export const R_XL   = 20;
export const R_FULL = 999;

// ─── DS Object (consumed by pages) ──────────────────────────────────────────
export const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,

  success:      '#059669', successBg: 'rgba(5,150,105,.08)',  successBorder: 'rgba(5,150,105,.2)',
  warning:      '#D97706', warningBg: 'rgba(217,119,6,.08)', warningBorder: 'rgba(217,119,6,.2)',
  danger:       '#DC2626', dangerBg:  'rgba(220,38,38,.08)', dangerBorder:  'rgba(220,38,38,.2)',
  info:         '#7C3AED', infoBg:    'rgba(124,58,237,.06)', infoBorder:   'rgba(124,58,237,.15)',

  shadowCard: SH_CARD, shadowCardHov: SH_HOVERED, shadowSm: SH_SM,
  shadowBtn: SH_BTN, shadowInset: SH_IN,

  radiusSm: R_SM, radiusMd: R_MD, radiusLg: R_LG, radiusXl: R_XL, radiusFull: R_FULL,
};

// ─── Style Helpers ───────────────────────────────────────────────────────────
export const card = (extra = {}) => ({
  background: 'var(--card, rgba(255,255,255,.6))',
  border: '1px solid var(--card-border, rgba(255,255,255,.7))',
  borderRadius: R_LG,
  boxShadow: 'var(--sh-card)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  ...extra,
});

export const cardSm = (extra = {}) => ({
  background: 'var(--card-soft, rgba(255,255,255,.5))',
  border: '1px solid var(--border)',
  borderRadius: R_MD,
  boxShadow: 'var(--sh-sm)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  ...extra,
});

export const inp = (extra = {}) => ({
  width: '100%',
  background: 'var(--input, #FFF8F3)',
  border: '1px solid var(--border)',
  borderRadius: R_SM,
  padding: '10px 13px',
  fontSize: 14,
  color: 'var(--txt, #4A3428)',
  outline: 'none',
  boxShadow: 'var(--sh-in)',
  fontFamily: 'inherit',
  transition: 'border .2s, box-shadow .2s, background .2s',
  ...extra,
});

// ─── Global CSS ──────────────────────────────────────────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0,0,24&display=swap');

  @keyframes spin  { to { transform: rotate(360deg) } }
  @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }

  * { box-sizing: border-box }
  html, body, #root { min-height: 100% }

  body {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--txt, #4A3428);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 0;
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
    letter-spacing: -.02em;
  }

  input, select, textarea, button { -webkit-appearance: none; touch-action: manipulation }
  button { font-family: inherit; cursor: pointer }
  ::placeholder { color: rgba(200,160,140,.55) !important }

  ::-webkit-scrollbar { width: 6px; height: 6px }
  ::-webkit-scrollbar-thumb { background: rgba(255,126,95,.2); border-radius: 999px }
  ::-webkit-scrollbar-track { background: transparent }

  /* ─── LIGHT THEME (Sunrise Gradient) ─────────────────────────────────────── */
  :root {
    color-scheme: light;
    --bg: linear-gradient(150deg, #FFF5EB 0%, #FDE8E8 35%, #EDE4F5 75%, #E4EEF8 100%);
    --card: rgba(255,255,255,.6);
    --card-soft: rgba(255,255,255,.5);
    --card-border: rgba(255,255,255,.7);
    --input: #FFF8F3;
    --txt:  #4A3428;
    --txt2: #B09080;
    --txt3: #C8B8A8;
    --border: rgba(200,160,140,.12);

    --sh-card: 0 8px 32px rgba(74,52,40,.08), inset 0 1px 0 rgba(255,255,255,.8);
    --sh-sm:   0 4px 16px rgba(74,52,40,.06), inset 0 1px 0 rgba(255,255,255,.7);
    --sh-in:   inset 1px 1px 4px rgba(200,160,140,.1), inset -1px -1px 4px rgba(255,255,255,.7);

    --sidebar:      rgba(255,255,255,.45);
    --sidebar-border: rgba(200,160,140,.1);
    --nav-hover:    rgba(255,126,95,.06);
    --nav-active:   rgba(255,126,95,.1);
    --nav-active-border: rgba(255,126,95,.12);
    --chip-bg:      rgba(255,255,255,.6);

    --surface-a:     rgba(255,255,255,.6);
    --surface-b:     rgba(255,248,243,.5);
    --surface-accent: rgba(255,126,95,.06);
    --surface-info:  rgba(124,58,237,.04);

    --positive-bg:  rgba(5,150,105,.06);  --positive-txt: #059669;
    --warning-bg:   rgba(217,119,6,.06);  --warning-txt:  #D97706;
    --danger-bg:    rgba(220,38,38,.06);  --danger-txt:   #DC2626;
    --neutral-bg:   rgba(200,160,140,.04); --neutral-txt: #6B5544;

    --input-on-card: rgba(255,255,255,.5);

    /* Sunrise-specific tokens */
    --gradient-primary: linear-gradient(135deg, #FF7E5F, #FEB47B);
    --accent-violet: #7C3AED;
    --accent-violet-soft: rgba(124,58,237,.06);
    --accent-violet-border: rgba(124,58,237,.1);
    --glass-bg: rgba(255,255,255,.6);
    --glass-border: rgba(255,255,255,.7);
    --glass-blur: blur(8px);
    --float-blob-1: rgba(255,126,95,.08);
    --float-blob-2: rgba(124,58,237,.06);
    --float-blob-3: rgba(96,165,250,.05);
  }

  /* ─── DARK THEME (Sunset / Deep Warm) ────────────────────────────────────── */
  [data-theme="dark"] {
    color-scheme: dark;
    --bg: linear-gradient(150deg, #1A1218 0%, #1E1520 35%, #161622 75%, #121820 100%);
    --card: rgba(40,28,35,.7);
    --card-soft: rgba(45,32,40,.6);
    --card-border: rgba(255,126,95,.1);
    --input: rgba(50,35,42,.8);
    --txt:  #F0E8E4;
    --txt2: #C8A898;
    --txt3: #8A7468;
    --border: rgba(255,126,95,.08);

    --sh-card: 0 8px 32px rgba(0,0,0,.3);
    --sh-sm:   0 4px 16px rgba(0,0,0,.25);
    --sh-in:   inset 0 1px 0 rgba(255,255,255,.04), inset 0 -1px 0 rgba(0,0,0,.2);

    --sidebar:      rgba(30,20,28,.7);
    --sidebar-border: rgba(255,126,95,.06);
    --nav-hover:    rgba(255,126,95,.08);
    --nav-active:   rgba(255,126,95,.12);
    --nav-active-border: rgba(255,126,95,.18);
    --chip-bg:      rgba(40,28,35,.7);

    --surface-a:     rgba(40,28,35,.7);
    --surface-b:     rgba(50,35,42,.5);
    --surface-accent: rgba(255,126,95,.06);
    --surface-info:  rgba(124,58,237,.08);

    --positive-bg:  rgba(5,150,105,.12);  --positive-txt: #6EE7B7;
    --warning-bg:   rgba(217,119,6,.12);  --warning-txt:  #FDE68A;
    --danger-bg:    rgba(220,38,38,.12);  --danger-txt:   #FCA5A5;
    --neutral-bg:   rgba(200,160,140,.06); --neutral-txt: #C8B8A8;

    --input-on-card: rgba(50,35,42,.7);

    --gradient-primary: linear-gradient(135deg, #FF7E5F, #FEB47B);
    --accent-violet: #A78BFA;
    --accent-violet-soft: rgba(167,139,250,.08);
    --accent-violet-border: rgba(167,139,250,.15);
    --glass-bg: rgba(40,28,35,.5);
    --glass-border: rgba(255,126,95,.08);
    --glass-blur: blur(12px);
    --float-blob-1: rgba(255,126,95,.06);
    --float-blob-2: rgba(167,139,250,.05);
    --float-blob-3: rgba(96,165,250,.04);
  }
`;
