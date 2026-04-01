import React, { useEffect, useRef, useState } from 'react';
import { DS, P, P2, A, WHITE, TXT3, R_SM, R_MD, R_LG, SH_SM, SH_HOVERED } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';

function UserMenu({ user, gam, onLogout, onSettings, toast, sidebar=false, theme='light', onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const mob = useIsMobile();
  const isDark = theme === 'dark';

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', flexShrink:0, width:sidebar?'100%':'auto' }}>
      <button
        onClick={()=>setOpen(v=>!v)}
        style={{
          display:'flex',
          alignItems:'center',
          gap:8,
          background:open?'var(--nav-hover)':WHITE,
          border:'none',
          borderRadius:R_MD,
          padding:sidebar?'8px 10px':'5px 10px',
          cursor:'pointer',
          fontFamily:'inherit',
          transition:'all .15s',
          boxShadow:SH_SM,
          width:sidebar?'100%':'auto',
        }}
      >
        <div style={{ width:30, height:30, borderRadius:'50%', background:`linear-gradient(135deg,${P},${A})`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'white', flexShrink:0 }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
        {(sidebar || !mob) && (
          <>
            <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--txt,#5a4a3a)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</p>
              <p style={{ fontSize:11, color:'var(--txt3,#c8b8a8)', margin:0 }}>{user.role==='head_of_sales'?'Head of Sales':'Closer'}</p>
            </div>
            {gam && <span style={{ fontSize:13 }} title={`${gam.level.name} · ${gam.points} pts`}>{gam.level.icon}</span>}
            <span style={{ fontSize:10, color:TXT3 }}>{open?'▲':'▼'}</span>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position:'absolute',
            right:0,
            bottom: sidebar ? 'calc(100% + 8px)' : 'auto',
            top: sidebar ? 'auto' : 'calc(100% + 6px)',
            background:'var(--card,#ffffff)',
            borderRadius:R_LG,
            boxShadow:SH_HOVERED,
            minWidth:220,
            zIndex:200,
            overflow:'hidden',
            border:'1px solid var(--border)',
          }}
        >
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', background:'var(--nav-hover)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${P},${P2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0 }}>
                {user.name?.charAt(0)}
              </div>
              <div>
                <p style={{ fontWeight:600, fontSize:13, color:'var(--txt,#5a4a3a)', margin:0 }}>{user.name}</p>
                <p style={{ fontSize:11, color:'var(--txt3,#c8b8a8)', margin:0 }}>{user.email}</p>
              </div>
            </div>
            {gam && (
              <div style={{ marginTop:10, padding:'7px 10px', background:`linear-gradient(135deg,${P},${P2})`, borderRadius:R_SM, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'white', fontWeight:500 }}>{gam.level.icon} {gam.level.name}</span>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:600 }}>{gam.points} pts</span>
              </div>
            )}
          </div>

          {[
            { icon:'⚙️', label:'Paramètres du compte', action:()=>{ onSettings(); setOpen(false); } },
            { icon:'🔔', label:'Notifications', action:()=>{ toast('Bientôt disponible !','info'); setOpen(false); } },
          ].map(({ icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--txt,#5a4a3a)', textAlign:'left', transition:'background .1s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}
            >
              <span style={{ fontSize:16, width:20, textAlign:'center' }}>{icon}</span>{label}
            </button>
          ))}

          <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
          <button
            onClick={()=>onToggleTheme?.()}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'var(--txt,#5a4a3a)', transition:'background .1s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
          >
            <span style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:16, width:20, textAlign:'center' }}>🌙</span>
              Mode nuit
            </span>
            <div style={{ width:38, height:20, borderRadius:10, background:isDark?'rgba(106,172,206,.55)':'rgba(200,184,168,.4)', position:'relative', transition:'background .2s' }}>
              <div style={{ width:16, height:16, borderRadius:'50%', background:'white', position:'absolute', top:2, left:isDark?20:2, transition:'left .2s' }}/>
            </div>
          </button>

          <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
          <button
            onClick={()=>{ onLogout(); setOpen(false); }}
            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, color:'#c05040', textAlign:'left', transition:'background .1s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}
          >
            <span style={{ fontSize:16, width:20, textAlign:'center' }}>↩</span>Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

export { UserMenu };
