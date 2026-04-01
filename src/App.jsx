import React, { useState, useEffect } from 'react';

// ─── Config & Utils ──────────────────────────────────────────────────────────
import { apiFetch, getToken, clearToken, setOnExpired } from './config/api';
import { P, P2, TXT, TXT2, TXT3, R_MD, SH_BTN, GLOBAL_CSS } from './styles/designSystem';
import { useIsMobile, useToast, useDebriefConfig } from './hooks';
import { normalizeDebriefTemplateCatalog, getDefaultTemplateCatalog } from './config/debriefTemplates';

// ─── UI Components ───────────────────────────────────────────────────────────
import { Toasts, Burst, Spinner } from './components/ui';
import { UserMenu } from './components/ui/UserMenu';

// ─── Auth ────────────────────────────────────────────────────────────────────
import { LoginPage, RegisterPage, ForgotPage, ResetPage } from './components/auth';

// ─── Pages ───────────────────────────────────────────────────────────────────
import { Dashboard, History } from './components/dashboard';
import { Detail } from './components/debrief/Detail';
import { NewDebrief } from './components/debrief/NewDebrief';
import { AccountSettings } from './components/debrief/Settings';
import { PipelinePage } from './components/pipeline';
import { HOSPage } from './components/team';
import { ObjectionLibrary } from './components/objections';

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const { list: toasts, toast } = useToast();

  const [authView, setAuthView] = useState('login');
  const [user,    setUser]    = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page,    setPage]    = useState('Dashboard');
  const [selId,   setSelId]   = useState(null);
  const [from,    setFrom]    = useState(null);
  const [debriefs, setDebriefs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [gam,     setGam]     = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [burst,   setBurst]   = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoAI, setAutoAI] = useState(false);
  const [leadContext, setLeadContext] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cd_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [debriefTemplates, setDebriefTemplates] = useState(() => getDefaultTemplateCatalog());
  const mob = useIsMobile();
  const [debriefConfig, setDebriefConfig] = useDebriefConfig();

  // Detect reset token in URL
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const rt = p.get('reset_token');
    if (rt) { setResetToken(rt); window.history.replaceState({}, '', window.location.pathname); }
  }, []);

  // Session expiry
  useEffect(() => {
    setOnExpired(() => {
      setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login');
      toast('Session expirée, veuillez vous reconnecter', 'error');
    });
  }, [toast]);

  // Restore session
  useEffect(() => {
    const t = getToken();
    if (!t) { setAuthLoading(false); return; }
    apiFetch('/auth/me').then(setUser).catch(() => clearToken()).finally(() => setAuthLoading(false));
  }, []);

  // Load data
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([apiFetch('/debriefs'), apiFetch('/gamification/me')])
      .then(([d, g]) => { setDebriefs(d); setGam(g); })
      .catch(err => toast(err.message, 'error'))
      .finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cd_theme', theme);
  }, [theme]);

  // Keep debrief config synchronized for all pages
  useEffect(() => {
    if (!user) {
      setDebriefConfig(null);
      setDebriefTemplates(getDefaultTemplateCatalog());
      return;
    }
    apiFetch('/debrief-config')
      .then(data => setDebriefConfig(data.sections || null))
      .catch(() => setDebriefConfig(null));

    apiFetch('/debrief-templates')
      .then(data => setDebriefTemplates(normalizeDebriefTemplateCatalog(data)))
      .catch(() => setDebriefTemplates(getDefaultTemplateCatalog()));
  }, [user, setDebriefConfig]);

  const navigate = (p, id=null, from=null, opts={}) => {
    setPage(p); setSelId(id);
    if (from) setFrom(from);
    else if (p !== 'Detail') setFrom(null);
    setAutoAI(!!opts.autoAI);
    setLeadContext(opts.leadContext || null);
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const onLogin = (u, g) => { setUser(u); if (g) setGam(g); setPage('Dashboard'); toast(`Bienvenue, ${u.name} !`); };
  const onLogout = () => { clearToken(); setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login'); toast('Déconnecté'); };

  const onSave = (debrief, g) => {
    setDebriefs(p => [debrief, ...p]);
    if (g) { setGam(g); if (g.pointsEarned>0) setBurst({ points:g.pointsEarned, levelUp:g.levelUp, newLevel:g.level.name }); }
  };

  const onUpdateDebrief = (debrief, g) => {
    setDebriefs(prev => prev.map(d => d.id === debrief.id ? debrief : d));
    if (g) setGam(g);
  };

  const onDelete = async id => {
    if (!confirm('Supprimer ce debrief ?')) return;
    try {
      const r = await apiFetch(`/debriefs/${id}`,{ method:'DELETE' });
      setDebriefs(p => p.filter(d => d.id!==id));
      if (r.gamification) setGam(r.gamification);
      toast('Debrief supprimé');
      navigate(from || 'Dashboard');
    } catch(e) { toast(e.message, 'error'); }
  };

  const selDebrief = debriefs.find(d => d.id===selId);
  const isHOS = user?.role === 'head_of_sales';
  const navItems = [
    { key:'Dashboard', label:'Dashboard', icon:'▦' },
    { key:'Pipeline',  label:'Pipeline',  icon:'◎' },
    { key:'Objections', label:'Objections', icon:'◉' },
    ...(isHOS ? [{ key:'HOSPage', label:'Équipe', icon:'◌' }] : []),
    { key:'NewDebrief', label:'Debrief',  icon:'✦' },
    { key:'History',   label:'Historique', icon:'◷' },
  ];

  // ─── Auth gates ────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>;
  if (resetToken)  return <ResetPage token={resetToken} onDone={()=>{ setResetToken(null); setAuthView('login'); toast('Mot de passe modifié !'); }}/>;
  if (!user) {
    if (authView==='register') return <RegisterPage onLogin={onLogin} goLogin={()=>setAuthView('login')}/>;
    if (authView==='forgot')   return <ForgotPage   goLogin={()=>setAuthView('login')}/>;
    return <LoginPage onLogin={onLogin} goRegister={()=>setAuthView('register')} goForgot={()=>setAuthView('forgot')}/>;
  }

  // ─── Main app ──────────────────────────────────────────────────────────────
  const Content = () => (
    <>
      {page==='Dashboard' && <Dashboard debriefs={debriefs} navigate={navigate} user={user} gam={gam} toast={toast}/>}
      {page==='NewDebrief' && (
        <NewDebrief
          navigate={navigate}
          onSave={onSave}
          onUpdate={onUpdateDebrief}
          toast={toast}
          user={user}
          debriefConfig={debriefConfig}
          debriefTemplates={debriefTemplates}
          setDebriefConfig={setDebriefConfig}
          leadContext={leadContext}
        />
      )}
      {page==='EditDebrief' && (
        <NewDebrief
          navigate={navigate}
          onSave={onSave}
          onUpdate={onUpdateDebrief}
          toast={toast}
          user={user}
          debriefConfig={debriefConfig}
          debriefTemplates={debriefTemplates}
          setDebriefConfig={setDebriefConfig}
          existingDebrief={selDebrief}
          fromPage={from || 'History'}
        />
      )}
      {page==='History'   && <History debriefs={debriefs} navigate={navigate} user={user}/>}
      {page==='Detail'    && <Detail debrief={selDebrief} navigate={navigate} onDelete={onDelete} fromPage={from} user={user} toast={toast} allDebriefs={debriefs} autoAI={autoAI}/>}
      {page==='Pipeline'  && <PipelinePage user={user} toast={toast} debriefs={debriefs} navigate={navigate}/>}
      {page==='Objections' && <ObjectionLibrary toast={toast}/>}
      {page==='HOSPage' && isHOS && <HOSPage toast={toast} allDebriefs={debriefs}/>}
    </>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--txt,#5a4a3a)', position:'relative', overflow:'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:-160, right:-120, width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,125,106,.24) 0%, rgba(232,125,106,0) 72%)', animation:'floatY 10s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', bottom:-180, left:-140, width:460, height:460, borderRadius:'50%', background:'radial-gradient(circle, rgba(106,172,206,.22) 0%, rgba(106,172,206,0) 72%)', animation:'floatY 13s ease-in-out infinite' }}/>
      </div>

      <div style={{ position:'relative', zIndex:1 }}>
        {burst && <Burst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel} onDone={()=>setBurst(null)}/>}
        <Toasts list={toasts}/>
        {showSettings && <AccountSettings user={user} onClose={()=>setShowSettings(false)} toast={toast}/>}

        {mob ? (
          <>
            <header style={{ position:'sticky', top:0, zIndex:50, background:'var(--sidebar)', borderBottom:'1px solid var(--border)', backdropFilter:'blur(16px)' }}>
              <div style={{ padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:58 }}>
                <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  <div style={{ width:34, height:34, borderRadius:11, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'white' }}>✦</div>
                  <div style={{ textAlign:'left' }}>
                    <span style={{ display:'block', fontSize:14, fontWeight:800, color:TXT, lineHeight:1.1 }}>CloserDebrief</span>
                    <span style={{ display:'block', fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:TXT3 }}>Sales Intelligence</span>
                  </div>
                </button>
                <UserMenu
                  user={user}
                  gam={gam}
                  onLogout={onLogout}
                  onSettings={()=>setShowSettings(true)}
                  toast={toast}
                  theme={theme}
                  onToggleTheme={()=>setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                />
              </div>
            </header>

            <main style={{ padding:'20px 14px 104px' }}>
              {dataLoading ? <Spinner full/> : Content()}
            </main>

            <nav style={{ position:'fixed', left:10, right:10, bottom:'max(10px, env(safe-area-inset-bottom))', background:'var(--sidebar)', border:'1px solid var(--border)', borderRadius:16, boxShadow:'var(--sh-card)', display:'flex', alignItems:'center', justifyContent:'space-around', padding:'6px 4px', zIndex:45, backdropFilter:'blur(14px)' }}>
              {navItems.map(({ key, label, icon }) => (
                <button key={key} onClick={()=>navigate(key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'4px 8px', fontFamily:'inherit', flex:1 }}>
                  <div style={{ minWidth:34, height:30, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', color:page===key?'white':TXT2, boxShadow:page===key?SH_BTN:'none', transition:'all .2s' }}>{icon}</div>
                  <span style={{ fontSize:10, fontWeight:700, color:page===key?P:TXT3 }}>{label}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          <div style={{ display:'flex', minHeight:'100vh' }}>
            <aside style={{ width:228, flexShrink:0, position:'sticky', top:0, height:'100vh', display:'flex', flexDirection:'column', background:'var(--sidebar)', borderRight:'1px solid rgba(255,255,255,.5)', boxShadow:'0 20px 40px rgba(85,66,63,.06)', padding:'26px 14px 16px', zIndex:40, backdropFilter:'blur(18px)' }}>
              <button
                onClick={()=>navigate('Dashboard')}
                style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:'8px 10px 22px', borderRadius:R_MD, marginBottom:4, width:'100%', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div style={{ width:36, height:36, borderRadius:12, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, color:'white', flexShrink:0 }}>✦</div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:22, fontWeight:800, color:TXT, lineHeight:1.02, letterSpacing:'-.03em' }}>CloserDebrief</div>
                  <div style={{ fontSize:10, color:TXT2, letterSpacing:'.22em', textTransform:'uppercase', fontWeight:800, marginTop:4 }}>Sales Intelligence</div>
                </div>
              </button>

              <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1 }}>
                {navItems.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={()=>navigate(key)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      gap:10,
                      padding:'12px 14px',
                      borderRadius:16,
                      border:'none',
                      fontSize:13,
                      fontWeight:700,
                      cursor:'pointer',
                      transition:'all .18s',
                      background:page===key?'rgba(244,236,229,.72)':'transparent',
                      color:page===key?P2:TXT2,
                      boxShadow:page===key?'inset 2px 0 0 #e87d6a':'none',
                      textAlign:'left',
                      width:'100%',
                    }}
                    onMouseEnter={e=>{ if(page!==key) e.currentTarget.style.background='var(--nav-hover)'; }}
                    onMouseLeave={e=>{ if(page!==key) e.currentTarget.style.background='transparent'; }}
                  >
                    <span style={{ fontSize:15, width:20, textAlign:'center' }}>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop:'1px solid rgba(176,144,128,.14)', paddingTop:12, marginTop:8, display:'grid', gap:8 }}>
                <button onClick={()=>setShowSettings(true)} style={{ display:'flex', alignItems:'center', gap:10, border:'none', background:'transparent', padding:'10px 12px', borderRadius:14, cursor:'pointer', color:TXT2, fontSize:13, fontWeight:700, textAlign:'left', fontFamily:'inherit' }}>
                  <span style={{ width:18, textAlign:'center' }}>⚙️</span> Paramètres
                </button>
                <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:10, border:'none', background:'transparent', padding:'10px 12px', borderRadius:14, cursor:'pointer', color:TXT2, fontSize:13, fontWeight:700, textAlign:'left', fontFamily:'inherit' }}>
                  <span style={{ width:18, textAlign:'center' }}>↩</span> Déconnexion
                </button>
              </div>
            </aside>

            <div style={{ flex:1, minWidth:0, maxWidth:'calc(100vw - 228px)' }}>
              <header style={{ position:'sticky', top:0, zIndex:45, height:72, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, background:'rgba(245,237,230,.74)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.42)' }}>
                <div style={{ width:'min(480px, 52vw)', position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:TXT3, fontSize:13 }}>⌕</span>
                  <input
                    placeholder="Rechercher un prospect, un debrief..."
                    style={{ width:'100%', border:'1px solid rgba(232,125,106,.12)', background:'rgba(255,255,255,.72)', color:TXT, borderRadius:999, padding:'10px 14px 10px 34px', boxShadow:'var(--sh-sm)', outline:'none', fontFamily:'inherit', fontSize:13 }}
                  />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button
                    onClick={()=>setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    style={{ width:34, height:34, borderRadius:12, border:'1px solid var(--border)', background:'rgba(255,255,255,.7)', cursor:'pointer', color:TXT2, fontSize:14 }}
                    title="Basculer le thème"
                  >
                    {theme === 'dark' ? '☀︎' : '☾'}
                  </button>
                  <UserMenu
                    user={user}
                    gam={gam}
                    onLogout={onLogout}
                    onSettings={()=>setShowSettings(true)}
                    toast={toast}
                    theme={theme}
                    onToggleTheme={()=>setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                  />
                </div>
              </header>

              <main style={{ padding:'30px 32px 42px', overflowX:'hidden', animation:'fadeUp .25s ease-out' }}>
                {dataLoading ? <Spinner full/> : Content()}
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
