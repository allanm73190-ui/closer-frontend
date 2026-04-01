// ─── DESIGN SYSTEM — Soft Pastel 3D ─────────────────────────────────────────

// Couleurs
export const P  = '#e87d6a';   // primaire corail
export const P2 = '#d4604e';   // primaire foncé
export const A  = '#6aacce';   // accent bleu ciel
export const BG = 'linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)';
export const WHITE = '#ffffff';
export const TXT  = '#5a4a3a';  // texte principal
export const TXT2 = '#b09080';  // texte secondaire
export const TXT3 = '#c8b8a8';  // texte muted
export const SAND = '#f5ede6';  // fond inputs

// Ombres neumorphiques
export const SH_CARD = '5px 5px 15px rgba(174,130,100,.18), -3px -3px 10px rgba(255,255,255,.9)';
export const SH_SM   = '3px 3px 8px rgba(174,130,100,.15), -2px -2px 6px rgba(255,255,255,.85)';
export const SH_BTN  = '0 6px 18px rgba(232,125,106,.35), inset 0 1px 0 rgba(255,255,255,.25)';
export const SH_IN   = 'inset 2px 2px 5px rgba(174,130,100,.15), inset -1px -1px 4px rgba(255,255,255,.9)';
export const SH_HOVERED = '6px 6px 20px rgba(174,130,100,.22), -3px -3px 10px rgba(255,255,255,.9)';

// Radius
export const R_SM = 10;
export const R_MD = 14;
export const R_LG = 18;
export const R_XL = 24;
export const R_FULL = 50;

// Design System object
export const DS = {
  bgApp: BG, bgCard: WHITE, bgInput: SAND,
  primary: P, primary2: P2, accent: A,
  textPrimary: TXT, textSecondary: TXT2, textMuted: TXT3,
  success:'#5a9858', successBg:'rgba(218,240,216,.8)', successBorder:'rgba(90,152,88,.3)',
  warning:'#c07830', warningBg:'rgba(254,243,224,.8)', warningBorder:'rgba(192,120,48,.3)',
  danger:'#c05040',  dangerBg:'rgba(253,232,228,.8)',  dangerBorder:'rgba(192,80,64,.3)',
  info:'#3a7a9a',    infoBg:'rgba(218,237,245,.8)',    infoBorder:'rgba(58,122,154,.3)',
  shadowCard: SH_CARD, shadowCardHov: SH_HOVERED, shadowSm: SH_SM,
  shadowBtn: SH_BTN, shadowInset: SH_IN,
  radiusSm:R_SM, radiusMd:R_MD, radiusLg:R_LG, radiusXl:R_XL, radiusFull:R_FULL,
};

// Style helpers
export const card = (extra={}) => ({
  background:'var(--card,#ffffff)', borderRadius:R_LG, boxShadow:'var(--sh-card)', ...extra
});

export const cardSm = (extra={}) => ({
  background:'var(--card,#ffffff)', borderRadius:R_MD, boxShadow:'var(--sh-sm)', ...extra
});

export const inp = (extra={}) => ({
  width:'100%', background:'var(--input,#f5ede6)', border:'1px solid var(--border)',
  borderRadius:R_SM, padding:'10px 13px', fontSize:14, color:'var(--txt,#5a4a3a)', outline:'none',
  boxShadow:'var(--sh-in)', fontFamily:'inherit', transition:'border .2s, box-shadow .2s', ...extra
});

// Global CSS string
export const GLOBAL_CSS = `
  @keyframes spin{to{transform:rotate(360deg)}}
  *{box-sizing:border-box}
  input,select,textarea,button{-webkit-appearance:none;touch-action:manipulation}
  ::placeholder{color:rgba(180,150,120,.5)!important}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-thumb{background:rgba(232,125,106,.3);border-radius:3px}
  ::-webkit-scrollbar-track{background:transparent}

  :root {
    color-scheme: light;
    --bg: linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%);
    --card: #ffffff;
    --input: #f5ede6;
    --txt: #5a4a3a;
    --txt2: #b09080;
    --txt3: #c8b8a8;
    --border: rgba(232,125,106,.1);
    --sh-card: 5px 5px 15px rgba(174,130,100,.18), -3px -3px 10px rgba(255,255,255,.9);
    --sh-sm: 3px 3px 8px rgba(174,130,100,.15), -2px -2px 6px rgba(255,255,255,.85);
    --sh-in: inset 2px 2px 5px rgba(174,130,100,.15), inset -1px -1px 4px rgba(255,255,255,.9);
    --sidebar: rgba(255,248,244,.97);
    --nav-hover: rgba(232,125,106,.08);
  }

  [data-theme="dark"] {
    color-scheme: dark;
    --bg: linear-gradient(160deg,#101823 0%,#1a1f2d 100%);
    --card: #f8fbff;
    --input: #eef3f9;
    --txt: #2f3a4b;
    --txt2: #5d6f84;
    --txt3: #7f8fa6;
    --border: rgba(106,172,206,.36);
    --sh-card: 0 14px 30px rgba(5,10,18,.34);
    --sh-sm: 0 8px 20px rgba(5,10,18,.28);
    --sh-in: inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(16,23,34,.08);
    --sidebar: rgba(15, 22, 33, .95);
    --nav-hover: rgba(106,172,206,.12);
  }
`;
