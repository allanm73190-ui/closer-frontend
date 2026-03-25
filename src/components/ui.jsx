import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, A, TXT, TXT2, TXT3, SAND, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, SH_HOVERED, R_SM, R_MD, R_LG, R_XL, R_FULL, card, cardSm, inp, BTN, DS, DEFAULT_DEBRIEF_CONFIG, PIPELINE_STAGES, SECTIONS } from '../constants.js';
import { fmtDate, fmtShort, computeScore, computeSectionScores, computeLevel, avgSectionScores } from '../utils.js';
import { useIsMobile, useToast, useDebriefConfig } from '../hooks.js';

export function Toasts({ list }) {
  const mob = useIsMobile();
  if (!list.length) return null;
  const bg = { success:'rgba(232,125,106,.92)', error:'rgba(220,38,38,.92)', info:'rgba(8,145,178,.92)' };
  const ic = { success:'✓', error:'✕', info:'ℹ' };
  return (
    <div style={{ position:'fixed', bottom:mob?16:24, right:mob?8:24, left:mob?8:'auto', zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {list.map(t => (
        <div key={t.id} style={{ padding:'12px 16px', borderRadius:10, fontSize:13, fontWeight:500, background:bg[t.type]||bg.success, color:'white', display:'flex', alignItems:'center', gap:8, animation:'toastIn .25s ease', boxShadow:'0 4px 20px rgba(0,0,0,.15)' }}>
          <span style={{ flexShrink:0 }}>{ic[t.type]||ic.success}</span>{t.msg}
        </div>
      ))}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        html,body,#root{background:linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%)!important;min-height:100%}
        input,select,textarea,button{-webkit-appearance:none;touch-action:manipulation}
        ::placeholder{color:rgba(180,150,120,.5)!important}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:rgba(232,125,106,.3);border-radius:3px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
    </div>
  );
}

// ─── BURST ────────────────────────────────────────────────────────────────────

export function Burst({ points, levelUp, newLevel, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'linear-gradient(135deg,#e87d6a,#d4604e)', borderRadius:20, padding:'24px 36px', color:'white', textAlign:'center', animation:'burstIn .4s cubic-bezier(.34,1.56,.64,1)', boxShadow:'0 8px 40px rgba(232,125,106,.4)' }}>
        <p style={{ fontSize:32, fontWeight:800, margin:0 }}>+{points} pts !</p>
        {levelUp && <p style={{ fontSize:15, fontWeight:600, margin:'8px 0 0', opacity:.9 }}>🎉 Niveau : {newLevel}</p>}
      </div>
      <style>{`@keyframes burstIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────


export function Input({ placeholder, value, onChange, type='text', required, autoFocus, style={} }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} autoFocus={autoFocus}
      style={{ ...inp(), borderColor: focus?P:'rgba(232,125,106,.15)',
        boxShadow: focus ? SH_IN+', 0 0 0 3px rgba(232,125,106,.1)' : SH_IN, ...style }}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
    />
  );
}


export function Textarea({ placeholder, value, onChange, rows=3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ ...inp(), resize:'vertical' }}
    />
  );
}



export function Btn({ children, onClick, type='button', variant='primary', disabled, style={} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      gap:8, padding:'10px 20px', borderRadius:R_FULL, fontSize:14, fontWeight:600,
      cursor:disabled?'not-allowed':'pointer', transition:'all .15s',
      opacity:disabled?.55:1, fontFamily:'inherit', ...BTN[variant], ...style
    }}>{children}</button>
  );
}


export function AlertBox({ type, message }) {
  if (!message) return null;
  const s = { error:{bg:'rgba(253,232,228,.8)',b:'rgba(192,80,64,.3)',c:'#c05040'}, success:{bg:'rgba(218,240,216,.8)',b:'rgba(90,152,88,.3)',c:'#5a9858'}, info:{bg:'rgba(218,237,245,.8)',b:'rgba(58,122,154,.3)',c:'#3a7a9a'} }[type||'info'];
  return <div style={{ background:s.bg, border:`1px solid ${s.b}`, color:s.c, padding:'12px 14px', borderRadius:R_SM, fontSize:14, marginBottom:16 }}>{message}</div>;
}


export function Spinner({ full=false, size=32 }) {
  const el = <><div style={{ width:size, height:size, border:`${size>20?4:3}px solid rgba(232,125,106,.15)`, borderTopColor:P, borderRadius:'50%', animation:'spin .75s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>;
  return full ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>{el}</div> : el;
}


export function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ ...card(), padding:'40px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <p style={{ fontWeight:700, fontSize:16, color:TXT, margin:'0 0 6px' }}>{title}</p>
      <p style={{ color:TXT3, fontSize:14, margin:`0 0 ${action?'20px':'0'}` }}>{subtitle}</p>
      {action}
    </div>
  );
}


export function Card({ children, style={} }) {
  return <div style={{ ...card(), ...style }}>{children}</div>;
}


export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(90,74,58,.2)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:WHITE, borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 -8px 32px rgba(174,130,100,.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:TXT, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:TXT3, cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── SCORE GAUGE ──────────────────────────────────────────────────────────────
