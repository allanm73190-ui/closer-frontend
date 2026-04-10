// ─── DESIGN SYSTEM — Sunrise Gradient ────────────────────────────────────────
// Drop-in replacement: every export name is preserved for backward compat.

// ─── Primary Palette ─────────────────────────────────────────────────────────
export const P  = '#FF7E5F';          // primary — warm coral-orange
export const P2 = '#FEB47B';          // primary gradient end — peach
export const A  = '#7C3AED';          // accent — violet
export const BG = 'linear-gradient(150deg,#FFF5EB 0%,#FDE8E8 35%,#EDE4F5 75%,#E4EEF8 100%)';
export const WHITE = '#ffffff';
export const TXT  = '#3A2418';        // text primary — warm dark brown
export const TXT2 = '#7A5040';        // text secondary
export const TXT3 = '#9A7A6A';        // text muted
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
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

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
    --txt:  #3A2418;
    --txt2: #7A5040;
    --txt3: #9A7A6A;
    --border: rgba(200,160,140,.18);

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
    --accent: #FF7E5F;
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
    --panel-1: linear-gradient(145deg, rgba(255,255,255,.92), rgba(255,246,238,.86));
    --panel-2: linear-gradient(145deg, rgba(255,255,255,.88), rgba(237,228,245,.32));
    --panel-3: linear-gradient(145deg, rgba(255,255,255,.88), rgba(228,238,248,.42));
    --panel-border-strong: rgba(232,125,106,.22);
    --panel-border-soft: rgba(200,160,140,.2);
    --hero-kicker: rgba(122,80,64,.85);
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

    --accent: #FF7E5F;
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
    --panel-1: linear-gradient(145deg, rgba(44,30,38,.9), rgba(31,22,30,.88));
    --panel-2: linear-gradient(145deg, rgba(48,33,42,.9), rgba(28,23,36,.82));
    --panel-3: linear-gradient(145deg, rgba(36,28,40,.92), rgba(25,27,39,.86));
    --panel-border-strong: rgba(255,126,95,.26);
    --panel-border-soft: rgba(255,126,95,.16);
    --hero-kicker: rgba(200,168,152,.85);
  }

  /* ─── Sunrise Structural Shell ─────────────────────────────────────────── */
  .cd-shell {
    display: flex;
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }

  .cd-sidebar {
    width: 220px;
    position: fixed;
    inset: 0 auto 0 0;
    display: flex;
    flex-direction: column;
    background: var(--sidebar);
    border-right: 1px solid var(--sidebar-border);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .cd-sidebar-logo {
    padding: 20px 16px 16px;
    border-bottom: 1px solid var(--border);
  }

  .cd-sidebar-brand {
    font-size: 17px;
    font-weight: 800;
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
    letter-spacing: -.02em;
    color: var(--txt);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .cd-beta-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: white;
    background: var(--gradient-primary);
  }

  .cd-sidebar-user {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .cd-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--accent-violet), var(--accent));
    color: white;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .cd-sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .cd-nav-section-label {
    padding: 4px 16px 2px;
    font-size: 9px;
    font-weight: 700;
    color: var(--txt3);
    text-transform: uppercase;
    letter-spacing: .08em;
    opacity: .8;
  }

  .cd-nav-item {
    width: 100%;
    border: none;
    background: transparent;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    border-left: 3px solid transparent;
    color: var(--txt3);
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    transition: all .16s ease;
  }

  .cd-nav-item:hover {
    background: var(--nav-hover);
    color: var(--txt);
  }

  .cd-nav-item.active {
    background: var(--nav-active);
    border-left-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
  }

  .cd-sidebar-bottom {
    border-top: 1px solid var(--border);
    padding: 8px 0;
  }

  .cd-main {
    margin-left: 220px;
    width: calc(100vw - 220px);
    min-width: 0;
  }

  .cd-main-header {
    position: sticky;
    top: 0;
    z-index: 40;
    min-height: 62px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 20px;
    background: var(--card-soft);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .cd-main-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: var(--txt);
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
    letter-spacing: -.02em;
  }

  .cd-main-subtitle {
    margin: 2px 0 0;
    font-size: 12px;
    color: var(--txt3);
  }

  .cd-main-content {
    padding: 24px 26px 40px;
    animation: fadeUp .24s ease;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .page-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--txt);
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
    letter-spacing: -.02em;
    line-height: 1.1;
  }

  .page-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--txt3);
  }

  .cd-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .cd-kpi-card {
    background: var(--panel-2);
    border: 1px solid var(--panel-border-soft);
    border-radius: 12px;
    padding: 14px 15px;
    box-shadow: var(--sh-sm);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transition: transform .16s ease, border-color .16s ease;
  }

  .cd-kpi-card:hover {
    transform: translateY(-1px);
    border-color: var(--panel-border-strong);
  }

  .cd-kpi-label {
    font-size: 10px;
    color: var(--txt3);
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }

  .cd-kpi-value {
    margin-top: 6px;
    font-size: 28px;
    line-height: 1;
    color: var(--txt);
    font-weight: 800;
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
  }

  .cd-kpi-delta {
    margin-top: 5px;
    font-size: 11px;
    font-weight: 600;
  }

  .cd-kpi-delta.up { color: #059669; }
  .cd-kpi-delta.warn { color: #D97706; }
  .cd-kpi-delta.down { color: #DC2626; }

  .cd-grid-aside {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 12px;
  }

  .cd-card {
    background: var(--panel-1);
    border: 1px solid var(--panel-border-soft);
    border-radius: 12px;
    box-shadow: var(--sh-card);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 14px;
  }

  .cd-page-flow {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cd-hero-card {
    background: var(--panel-1);
    border: 1px solid var(--panel-border-strong);
    border-radius: 14px;
    box-shadow: var(--sh-card);
    padding: 18px 18px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .cd-hero-kicker {
    margin: 0 0 5px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: var(--hero-kicker);
  }

  .cd-hero-title {
    margin: 0;
    font-size: 24px;
    line-height: 1.06;
    font-weight: 800;
    color: var(--txt);
    font-family: 'Manrope', 'Inter', system-ui, sans-serif;
    letter-spacing: -.02em;
  }

  .cd-hero-subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--txt2);
  }

  .cd-section-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }

  .cd-section-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: start;
  }

  .cd-surface-muted {
    background: var(--panel-3);
    border: 1px solid var(--panel-border-soft);
    border-radius: 12px;
    box-shadow: var(--sh-sm);
  }

  .cd-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 9px;
    border-radius: 999px;
    border: 1px solid var(--panel-border-soft);
    background: var(--chip-bg);
    color: var(--txt2);
    font-size: 11px;
    font-weight: 700;
  }

  .cd-card-title {
    font-size: 11px;
    color: var(--txt3);
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .cd-mobile-top {
    position: sticky;
    top: 0;
    z-index: 50;
    min-height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    background: var(--sidebar);
    border-bottom: 1px solid var(--sidebar-border);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .cd-mobile-main {
    padding: 16px 14px 96px;
  }

  .cd-mobile-bottom {
    position: fixed;
    left: 10px;
    right: 10px;
    bottom: max(10px, env(safe-area-inset-bottom));
    border-radius: 15px;
    border: 1px solid var(--sidebar-border);
    background: var(--sidebar);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: var(--sh-sm);
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 2px;
    padding: 6px 4px;
    z-index: 45;
  }

  @media (max-width: 1100px) {
    .cd-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .cd-grid-aside {
      grid-template-columns: 1fr;
    }
    .cd-section-grid-3 {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 768px) {
    .cd-hero-title {
      font-size: 21px;
    }
    .cd-section-grid-2,
    .cd-section-grid-3 {
      grid-template-columns: 1fr;
    }
  }
`;
