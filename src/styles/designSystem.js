// ─── DESIGN SYSTEM — Home Spirit / Dynamic Glass ────────────────────────────

// Couleurs
export const P  = '#e87d6a';
export const P2 = '#d4604e';
export const A  = '#6aacce';
export const BG = 'linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)';
export const WHITE = '#ffffff';
export const TXT  = '#5a4a3a';
export const TXT2 = '#b09080';
export const TXT3 = '#c8b8a8';
export const SAND = '#f7f0ea';

// Ombres
export const SH_CARD = '0 18px 40px rgba(112,79,57,.10), inset 0 1px 0 rgba(255,255,255,.9)';
export const SH_SM   = '0 10px 22px rgba(112,79,57,.08), inset 0 1px 0 rgba(255,255,255,.85)';
export const SH_BTN  = '0 10px 26px rgba(232,125,106,.32), inset 0 1px 0 rgba(255,255,255,.24)';
export const SH_IN   = 'inset 2px 2px 8px rgba(180,144,128,.18), inset -2px -2px 8px rgba(255,255,255,.85)';
export const SH_HOVERED = '0 20px 44px rgba(112,79,57,.16), inset 0 1px 0 rgba(255,255,255,.92)';

// Radius
export const R_SM = 10;
export const R_MD = 14;
export const R_LG = 18;
export const R_XL = 24;
export const R_FULL = 999;

// Design System object
export const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,
  success:'#059669', successBg:'rgba(5,150,105,.12)', successBorder:'rgba(5,150,105,.3)',
  warning:'#d97706', warningBg:'rgba(217,119,6,.12)', warningBorder:'rgba(217,119,6,.3)',
  danger:'#dc2626',  dangerBg:'rgba(220,38,38,.12)',  dangerBorder:'rgba(220,38,38,.3)',
  info:'#3a7a9a',    infoBg:'rgba(106,172,206,.14)',  infoBorder:'rgba(58,122,154,.28)',
  shadowCard: SH_CARD, shadowCardHov: SH_HOVERED, shadowSm: SH_SM,
  shadowBtn: SH_BTN, shadowInset: SH_IN,
  radiusSm:R_SM, radiusMd:R_MD, radiusLg:R_LG, radiusXl:R_XL, radiusFull:R_FULL,
};

// Style helpers
export const card = (extra={}) => ({
  background:'var(--card,#ffffff)',
  border:'1px solid var(--card-border, rgba(255,255,255,.62))',
  borderRadius:R_LG,
  boxShadow:'var(--sh-card)',
  ...extra,
});

export const cardSm = (extra={}) => ({
  background:'var(--card-soft, rgba(255,255,255,.74))',
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
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0,0,24&display=swap');

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
    --bg: linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%);
    --card: rgba(255,255,255,.96);
    --card-soft: rgba(255,255,255,.9);
    --card-border: rgba(195,147,121,.3);
    --input: #f7f0ea;
    --txt: #5a4a3a;
    --txt2: #b09080;
    --txt3: #c8b8a8;
    --border: rgba(195,147,121,.34);
    --sh-card: 0 22px 48px rgba(112,79,57,.16), inset 0 1px 0 rgba(255,255,255,.95);
    --sh-sm: 0 12px 26px rgba(112,79,57,.13), inset 0 1px 0 rgba(255,255,255,.9);
    --sh-in: inset 2px 2px 8px rgba(180,144,128,.18), inset -2px -2px 8px rgba(255,255,255,.85);
    --sidebar: rgba(255,255,255,.56);
    --nav-hover: rgba(244,236,229,.88);
    --chip-bg: rgba(255,255,255,.68);
  }

  [data-theme="dark"] {
    color-scheme: dark;
    --bg: radial-gradient(circle at 16% 8%,#213349 0%,transparent 38%), radial-gradient(circle at 84% 14%,#4b2f34 0%,transparent 34%), linear-gradient(160deg,#131927 0%,#1b2232 52%,#161a28 100%);
    --card: rgba(27,38,56,.94);
    --card-soft: rgba(30,42,61,.88);
    --card-border: rgba(116,174,212,.38);
    --input: rgba(33,45,64,.92);
    --txt: #e8edf5;
    --txt2: #bdd0e4;
    --txt3: #8da1b8;
    --border: rgba(116,174,212,.4);
    --sh-card: 0 28px 58px rgba(0,0,0,.4);
    --sh-sm: 0 14px 28px rgba(0,0,0,.34);
    --sh-in: inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.25);
    --sidebar: rgba(17,24,38,.72);
    --nav-hover: rgba(106,172,206,.18);
    --chip-bg: rgba(20,29,44,.8);
  }
`;
