import React, { useState, useEffect } from 'react';
import { DS, P, P2, R_SM, R_MD, R_LG, R_FULL, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, card, inp } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';

// ─── TOASTS ──────────────────────────────────────────────────────────────────
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
      <style>{`@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── BURST (gamification animation) ──────────────────────────────────────────
export function Burst({ points, levelUp, newLevel, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9998, pointerEvents:'none', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:`linear-gradient(135deg,${P},${P2})`, borderRadius:20, padding:'24px 36px', color:'white', textAlign:'center', animation:'burstIn .4s cubic-bezier(.34,1.56,.64,1)', boxShadow:'0 8px 40px rgba(232,125,106,.4)' }}>
        <p style={{ fontSize:32, fontWeight:800, margin:0 }}>+{points} pts !</p>
        {levelUp && <p style={{ fontSize:15, fontWeight:600, margin:'8px 0 0', opacity:.9 }}>🎉 Niveau : {newLevel}</p>}
      </div>
      <style>{`@keyframes burstIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function Input({ placeholder, value, onChange, type='text', required, autoFocus, style={} }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} autoFocus={autoFocus}
      style={{ ...inp(), borderColor: focus?P:'rgba(232,125,106,.15)',
        boxShadow: focus ? SH_IN+', 0 0 0 3px rgba(232,125,106,.1)' : SH_IN, ...style }}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
    />
  );
}

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export function Textarea({ placeholder, value, onChange, rows=3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ ...inp(), resize:'vertical' }}
    />
  );
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────
const BTN = {
  primary:   { background:`linear-gradient(135deg,${P},${P2})`, color:'white', border:'none', boxShadow:SH_BTN },
  secondary: { background:'var(--card,#ffffff)', color:'var(--txt,#5a4a3a)', border:'1px solid var(--border)', boxShadow:'var(--sh-sm)' },
  danger:    { background:'rgba(253,232,228,.8)', color:'#c05040', border:'1px solid rgba(192,80,64,.3)', boxShadow:'none' },
  ghost:     { background:'transparent', color:'var(--txt2,#b09080)', border:'none', boxShadow:'none' },
  green:     { background:'rgba(218,240,216,.8)', color:'#5a9858', border:'1px solid rgba(90,152,88,.3)', boxShadow:'none' },
};
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

// ─── ALERT BOX ───────────────────────────────────────────────────────────────
export function AlertBox({ type, message }) {
  if (!message) return null;
  const s = { error:{bg:DS.dangerBg,b:DS.dangerBorder,c:DS.danger}, success:{bg:DS.successBg,b:DS.successBorder,c:DS.success}, info:{bg:DS.infoBg,b:DS.infoBorder,c:DS.info} }[type||'info'];
  return <div style={{ background:s.bg, border:`1px solid ${s.b}`, color:s.c, padding:'12px 14px', borderRadius:R_SM, fontSize:14, marginBottom:16 }}>{message}</div>;
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export function Spinner({ full=false, size=32 }) {
  const el = <><div style={{ width:size, height:size, border:`${size>20?4:3}px solid rgba(232,125,106,.15)`, borderTopColor:P, borderRadius:'50%', animation:'spin .75s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>;
  return full ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh' }}>{el}</div> : el;
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ ...card(), padding:'40px 24px', textAlign:'center' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <p style={{ fontWeight:700, fontSize:16, color:'var(--txt,#5a4a3a)', margin:'0 0 6px' }}>{title}</p>
      <p style={{ color:'var(--txt3,#c8b8a8)', fontSize:14, margin:`0 0 ${action?'20px':'0'}` }}>{subtitle}</p>
      {action}
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
export function Card({ children, style={} }) {
  return <div style={{ ...card(), ...style }}>{children}</div>;
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  const mob = useIsMobile();
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(20,28,40,.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:mob?8:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--card,#ffffff)', borderRadius:mob?14:18, padding:mob?16:22, width:mob?'calc(100vw - 16px)':'min(640px, calc(100vw - 40px))', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--sh-card)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--txt,#5a4a3a)', margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--txt3,#c8b8a8)', cursor:'pointer', fontSize:22, lineHeight:1, padding:'2px 6px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── SCORE GAUGE ─────────────────────────────────────────────────────────────
export function ScoreGauge({ percentage, size='lg' }) {
  const r  = size==='lg' ? 54 : 36;
  const st = size==='lg' ? 8  : 6;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(percentage, 100) / 100) * circ;
  const vb   = size==='lg' ? 130 : 90;
  const c    = vb / 2;
  const color = percentage>=80?'#059669':percentage>=60?'#d97706':percentage>=40?'#e87d6a':'#ef4444';
  return (
    <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="#e2e8f0" strokeWidth={st}/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={st}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`} style={{ transition:'stroke-dashoffset .8s ease' }}/>
      </svg>
      <div style={{ position:'absolute', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontWeight:700, fontSize:size==='lg'?28:16, color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

export function ScoreBadge({ pct }) {
  const s = pct>=80?{bg:'rgba(209,250,229,.85)',c:'#065f46',b:'rgba(110,231,183,.6)'}:pct>=60?{bg:'rgba(254,243,199,.85)',c:'#92400e',b:'rgba(252,211,77,.6)'}:pct>=40?{bg:'rgba(237,233,254,.85)',c:'#4c1d95',b:'rgba(196,181,253,.6)'}:{bg:'rgba(254,226,226,.85)',c:'#991b1b',b:'rgba(252,165,165,.6)'};
  return <span style={{ background:s.bg, color:s.c, border:`1px solid ${s.b}`, padding:'3px 10px', borderRadius:8, fontWeight:700, fontSize:13, whiteSpace:'nowrap' }}>{pct}%</span>;
}

export function ClosedBadge({ isClosed }) {
  if (isClosed === null || isClosed === undefined) return null;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, fontSize:12, fontWeight:600, whiteSpace:'nowrap', background:isClosed?'#d1fae5':'#fee2e2', color:isClosed?'#065f46':'#991b1b' }}>
      {isClosed ? '✓ Closer' : '✗ Non Closer'}
    </span>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
export function ProgBar({ label, current, target, color='#e87d6a' }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--txt2,#b09080)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: pct >= 100 ? '#059669' : 'var(--txt,#5a4a3a)' }}>{current}/{target}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(232,125,106,.1)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#059669' : color, borderRadius: 3, transition: 'width .5s' }}/>
      </div>
    </div>
  );
}
