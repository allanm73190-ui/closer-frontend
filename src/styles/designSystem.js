// ─── DESIGN SYSTEM — Home Spirit / Dynamic Glass ────────────────────────────

// Couleurs
export const P  = '#e87d6a';
export const P2 = '#d4604e';
export const A  = '#6aacce';
export const BG = 'linear-gradient(160deg,#f8efe8 0%,#eef4f8 52%,#f8f1ea 100%)';
export const WHITE = '#ffffff';
export const TXT  = '#5a4a3a';
export const TXT2 = '#8f7462';
export const TXT3 = '#bda998';
export const SAND = '#f6eee6';

// Ombres
export const SH_CARD = '0 20px 40px rgba(85,66,63,.08), 0 6px 14px rgba(85,66,63,.06)';
export const SH_SM   = '0 8px 18px rgba(85,66,63,.08)';
export const SH_BTN  = '0 10px 26px rgba(232,125,106,.32), inset 0 1px 0 rgba(255,255,255,.24)';
export const SH_IN   = 'inset 0 1px 0 rgba(255,255,255,.78), inset 0 -1px 0 rgba(90,74,58,.08)';
export const SH_HOVERED = '0 24px 48px rgba(85,66,63,.12), 0 8px 18px rgba(85,66,63,.08)';

// Radius
export const R_SM = 10;
export const R_MD = 14;
export const R_LG = 20;
export const R_XL = 28;
export const R_FULL = 999;

// Design System object
export const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,
  success:'#059669', successBg:'rgba(209,250,229,.7)', successBorder:'rgba(16,185,129,.32)',
  warning:'#c07830', warningBg:'rgba(254,243,199,.75)', warningBorder:'rgba(217,119,6,.3)',
  danger:'#dc2626',  dangerBg:'rgba(254,226,226,.75)',  dangerBorder:'rgba(220,38,38,.3)',
  info:'#3a7a9a',    infoBg:'rgba(219,234,254,.7)',     infoBorder:'rgba(58,122,154,.28)',
  shadowCard: SH_CARD, shadowCardHov: SH_HOVERED, shadowSm: SH_SM,
  shadowBtn: SH_BTN, shadowInset: SH_IN,
  radiusSm:R_SM, radiusMd:R_MD, radiusLg:R_LG, radiusXl:R_XL, radiusFull:R_FULL,
};

// Style helpers
export const card = (extra={}) => ({
  background:'var(--card,#ffffff)',
  border:'1px solid var(--border)',
  borderRadius:R_LG,
  boxShadow:'var(--sh-card)',
  ...extra,
});

export const cardSm = (extra={}) => ({
  background:'var(--card-soft,#fff)',
  border:'1px solid var(--border)',
  borderRadius:R_MD,
  boxShadow:'var(--sh-sm)',
  ...extra,
});

export const inp = (extra={}) => ({
  width:'100%',
  background:'var(--input,#f5ede6)',
  border:'1px solid var(--border)',
  borderRadius:R_SM,
  padding:'11px 13px',
  fontSize:14,
  color:'var(--txt,#5a4a3a)',
  outline:'none',
  boxShadow:'var(--sh-in)',
  fontFamily:'inherit',
  transition:'border .2s, box-shadow .2s, transform .2s',
  ...extra,
});

// Global CSS string
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

  *{box-sizing:border-box}
  html,body,#root{min-height:100%}
  body{
    margin:0;
    font-family:'Inter',system-ui,-apple-system,sans-serif;
    color:var(--txt,#5a4a3a);
    background:var(--bg);
    -webkit-font-smoothing:antialiased;
    text-rendering:optimizeLegibility;
  }
  h1,h2,h3,h4,h5,h6{
    margin:0;
    font-family:'Manrope','Inter',system-ui,sans-serif;
    letter-spacing:-.02em;
  }
  input,select,textarea,button{-webkit-appearance:none;touch-action:manipulation}
  button{font-family:inherit}
  ::placeholder{color:rgba(176,144,128,.65)!important}
  ::-webkit-scrollbar{width:7px;height:7px}
  ::-webkit-scrollbar-thumb{background:rgba(232,125,106,.26);border-radius:999px}
  ::-webkit-scrollbar-track{background:transparent}

  :root {
    color-scheme: light;
    --bg: linear-gradient(160deg,#f8efe8 0%,#eef4f8 52%,#f8f1ea 100%);
    --card: rgba(255,255,255,.9);
    --card-soft: rgba(255,255,255,.76);
    --input: rgba(250,241,235,.95);
    --txt: #5a4a3a;
    --txt2: #8f7462;
    --txt3: #bda998;
    --border: rgba(232,125,106,.16);
    --sh-card: 0 20px 40px rgba(85,66,63,.08), 0 6px 14px rgba(85,66,63,.06);
    --sh-sm: 0 8px 18px rgba(85,66,63,.08);
    --sh-in: inset 0 1px 0 rgba(255,255,255,.78), inset 0 -1px 0 rgba(90,74,58,.08);
    --sidebar: rgba(255,248,244,.74);
    --nav-hover: rgba(232,125,106,.12);
    --chip-bg: rgba(255,255,255,.84);
  }

  [data-theme="dark"] {
    color-scheme: dark;
    --bg: radial-gradient(circle at 16% 8%,#213349 0%,transparent 38%), radial-gradient(circle at 84% 14%,#4b2f34 0%,transparent 34%), linear-gradient(160deg,#131927 0%,#1b2232 52%,#161a28 100%);
    --card: rgba(29,39,56,.88);
    --card-soft: rgba(33,43,60,.8);
    --input: rgba(33,45,64,.92);
    --txt: #e8edf5;
    --txt2: #bdd0e4;
    --txt3: #8da1b8;
    --border: rgba(106,172,206,.28);
    --sh-card: 0 24px 50px rgba(0,0,0,.34);
    --sh-sm: 0 10px 24px rgba(0,0,0,.28);
    --sh-in: inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.25);
    --sidebar: rgba(17,24,38,.72);
    --nav-hover: rgba(106,172,206,.18);
    --chip-bg: rgba(20,29,44,.8);
  }
`;
