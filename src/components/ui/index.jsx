import React, { useState, useEffect } from 'react';
import { DS, P, P2, R_SM, R_MD, R_LG, R_FULL, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, card, inp } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
export { Icon } from './Icon';

// ─── TOASTS ──────────────────────────────────────────────────────────────────
export function Toasts({ list }) {
  const mob = useIsMobile();
  if (!list.length) return null;
  const bg = {
    success: 'var(--gradient-primary)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)',
    info: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
  };
  const ic = { success: '\u2713', error: '\u2715', info: '\u2139' };
  return (
    <div style={{ position: 'fixed', bottom: mob ? 18 : 26, right: mob ? 10 : 24, left: mob ? 10 : 'auto', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map(t => (
        <div key={t.id} style={{
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: bg[t.type] || bg.success, color: 'white',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'toastIn .25s ease',
          boxShadow: '0 10px 24px rgba(74,52,40,.18)',
          border: '1px solid rgba(255,255,255,.2)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          <span style={{ flexShrink: 0 }}>{ic[t.type] || ic.success}</span>{t.msg}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: 'var(--gradient-primary)', borderRadius: 20,
        padding: '26px 38px', color: 'white', textAlign: 'center',
        animation: 'burstIn .4s cubic-bezier(.34,1.56,.64,1)',
        boxShadow: '0 16px 40px rgba(255,126,95,.35)',
        border: '1px solid rgba(255,255,255,.25)',
      }}>
        <p style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>+{points} pts !</p>
        {levelUp && <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 0', opacity: .9 }}>Niveau : {newLevel}</p>}
      </div>
      <style>{`@keyframes burstIn{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function Input({ placeholder, value, onChange, type = 'text', required, autoFocus, style = {} }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      required={required} autoFocus={autoFocus}
      style={{
        ...inp(),
        borderColor: focus ? P : 'var(--border)',
        transform: focus ? 'translateY(-1px)' : 'none',
        boxShadow: focus
          ? `${SH_IN}, 0 0 0 3px rgba(255,126,95,.1), 0 4px 12px rgba(255,126,95,.1)`
          : SH_IN,
        ...style,
      }}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
    />
  );
}

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export function Textarea({ placeholder, value, onChange, rows = 3 }) {
  return (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows}
      style={{ ...inp(), resize: 'vertical' }}
    />
  );
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────
const BTN = {
  primary: {
    background: 'var(--gradient-primary)', color: 'white',
    border: '1px solid rgba(255,255,255,.2)', boxShadow: SH_BTN,
  },
  secondary: {
    background: 'var(--glass-bg)', color: 'var(--txt, #4A3428)',
    border: '1px solid var(--border)', boxShadow: 'var(--sh-sm)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
  },
  danger: {
    background: 'var(--danger-bg)', color: 'var(--danger-txt)',
    border: '1px solid var(--danger-bg)', boxShadow: 'none',
  },
  ghost: {
    background: 'transparent', color: 'var(--txt2, #B09080)',
    border: 'none', boxShadow: 'none',
  },
  green: {
    background: 'var(--positive-bg)', color: 'var(--positive-txt)',
    border: '1px solid var(--positive-bg)', boxShadow: 'none',
  },
};
export function Btn({ children, onClick, type = 'button', variant = 'primary', disabled, style = {} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '10px 20px', minHeight: 38, borderRadius: 10, fontSize: 13, fontWeight: 600, letterSpacing: '.01em',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .18s',
      opacity: disabled ? .55 : 1, fontFamily: 'inherit', ...BTN[variant], ...style,
    }}>{children}</button>
  );
}

// ─── ALERT BOX ───────────────────────────────────────────────────────────────
export function AlertBox({ type, message }) {
  if (!message) return null;
  const s = {
    error: { bg: 'var(--danger-bg)', b: 'var(--danger-bg)', c: 'var(--danger-txt)' },
    success: { bg: 'var(--positive-bg)', b: 'var(--positive-bg)', c: 'var(--positive-txt)' },
    info: { bg: 'var(--accent-violet-soft)', b: 'var(--accent-violet-border)', c: 'var(--accent-violet)' },
  }[type || 'info'];
  return <div style={{ background: s.bg, border: `1px solid ${s.b}`, color: s.c, padding: '12px 14px', borderRadius: R_SM, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{message}</div>;
}

// ─── SPINNER ─────────────────────────────────────────────────────────────────
export function Spinner({ full = false, size = 32 }) {
  const el = <><div style={{ width: size, height: size, border: `${size > 20 ? 4 : 3}px solid rgba(255,126,95,.12)`, borderTopColor: P, borderRadius: '50%', animation: 'spin .75s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></>;
  return full ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>{el}</div> : el;
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function Empty({ icon, title, subtitle, action }) {
  return (
    <div style={{ ...card(), padding: '44px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--txt)', margin: '0 0 6px' }}>{title}</p>
      <p style={{ color: 'var(--txt3)', fontSize: 14, margin: `0 0 ${action ? '20px' : '0'}` }}>{subtitle}</p>
      {action}
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '' }) {
  const classes = ['card', className].filter(Boolean).join(' ');
  return <div className={classes} style={{ ...card(), ...style }}>{children}</div>;
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  const mob = useIsMobile();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(74,52,40,.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: mob ? 8 : 20,
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)', borderRadius: mob ? 16 : 18,
        padding: mob ? 16 : 22,
        width: mob ? 'calc(100vw - 16px)' : 'min(680px, calc(100vw - 40px))',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: 'var(--sh-card)', border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--txt)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '2px 6px' }}>{'\u2715'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── SCORE GAUGE ─────────────────────────────────────────────────────────────
export function ScoreGauge({ percentage, size = 'lg' }) {
  const r = size === 'lg' ? 54 : 36;
  const st = size === 'lg' ? 8 : 6;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percentage, 100) / 100) * circ;
  const vb = size === 'lg' ? 130 : 90;
  const c = vb / 2;
  const color = percentage >= 80 ? '#059669' : percentage >= 60 ? '#D97706' : percentage >= 40 ? P : '#EF4444';
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={vb} height={vb} viewBox={`0 0 ${vb} ${vb}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(200,160,140,.1)" strokeWidth={st} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={st}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`} style={{ transition: 'stroke-dashoffset .8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: size === 'lg' ? 28 : 16, color }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

export function ScoreBadge({ pct }) {
  const s = pct >= 80
    ? { bg: 'var(--positive-bg)', c: 'var(--positive-txt)', b: 'var(--positive-bg)' }
    : pct >= 60
    ? { bg: 'var(--warning-bg)', c: 'var(--warning-txt)', b: 'var(--warning-bg)' }
    : pct >= 40
    ? { bg: 'var(--accent-violet-soft)', c: 'var(--accent-violet)', b: 'var(--accent-violet-border)' }
    : { bg: 'var(--danger-bg)', c: 'var(--danger-txt)', b: 'var(--danger-bg)' };
  return <span style={{ background: s.bg, color: s.c, border: `1px solid ${s.b}`, padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{pct}%</span>;
}

export function ClosedBadge({ isClosed, compact = false }) {
  if (isClosed === null || isClosed === undefined) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: compact ? '3px 8px' : '5px 10px',
      borderRadius: 8,
      fontSize: compact ? 11 : 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      background: isClosed ? 'var(--positive-bg)' : 'var(--danger-bg)',
      color: isClosed ? 'var(--positive-txt)' : 'var(--danger-txt)',
      border: `1px solid ${isClosed ? 'rgba(5,150,105,.24)' : 'rgba(220,38,38,.2)'}`,
    }}>
      {isClosed ? (compact ? 'Closé' : '\u2713 Closé') : (compact ? 'Non closé' : '\u2717 Non closé')}
    </span>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
export function ProgBar({ label, current, target, color = P }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--txt2)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: pct >= 100 ? '#059669' : 'var(--txt)' }}>{current}/{target}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(200,160,140,.08)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#059669' : color, borderRadius: 3, transition: 'width .5s' }} />
      </div>
    </div>
  );
}
