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

const DESKTOP_SIDEBAR_WIDTH = 214;

const PAGE_META = {
  Dashboard: { title:'Tableau de bord', subtitle:'Performance globale et priorités du jour' },
  Pipeline: { title:'Pipeline', subtitle:'Suivi dynamique des opportunités en cours' },
  Objections: { title:'Objections', subtitle:'Bibliothèque active et réponses validées' },
  HOSPage: { title:'Espace équipe', subtitle:'Pilotage des équipes et objectifs HOS' },
  NewDebrief: { title:'Nouveau debrief', subtitle:'Capture structurée de votre dernier appel' },
  EditDebrief: { title:'Modifier le debrief', subtitle:'Ajustez et enrichissez le débrief existant' },
  History: { title:'Historique', subtitle:'Retrouvez et filtrez vos debriefs passés' },
  Detail: { title:'Détail debrief', subtitle:'Analyse complète, IA et export PDF' },
};

function NavIcon({ name, active=false, size=18, color='currentColor' }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize:size,
        lineHeight:1,
        color,
        fontVariationSettings:`'FILL' ${active ? 1 : 0}, 'wght' ${active ? 650 : 500}, 'GRAD' 0, 'opsz' 24`,
      }}
    >
      {name}
    </span>
  );
}

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
    { key:'Dashboard', label:'Dashboard', icon:'dashboard' },
    { key:'Pipeline',  label:'Pipeline',  icon:'analytics' },
    { key:'Objections', label:'Objections', icon:'forum' },
    ...(isHOS ? [{ key:'HOSPage', label:'Équipe', icon:'groups' }] : []),
    { key:'NewDebrief', label:'Debrief',  icon:'add_circle' },
    { key:'History',   label:'Historique', icon:'history' },
  ];
  const pageMeta = PAGE_META[page] || PAGE_META.Dashboard;

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
                  <div style={{ minWidth:34, height:30, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', color:page===key?'white':TXT2, boxShadow:page===key?SH_BTN:'none', transition:'all .2s' }}>
                    <NavIcon name={icon} active={page===key} size={17} color={page===key ? 'white' : TXT2} />
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:page===key?P:TXT3 }}>{label}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          <div style={{ display:'flex', minHeight:'100vh' }}>
            <aside style={{ width:DESKTOP_SIDEBAR_WIDTH, flexShrink:0, position:'fixed', left:0, top:0, bottom:0, display:'flex', flexDirection:'column', background:`linear-gradient(165deg, ${P}, ${P2})`, borderRight:'1px solid rgba(255,255,255,.28)', boxShadow:'0 20px 40px rgba(85,66,63,.16)', padding:'20px 10px 12px', zIndex:60 }}>
              <button
                onClick={()=>navigate('Dashboard')}
                style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:'6px 8px 14px', borderRadius:R_MD, marginBottom:2, width:'100%', transition:'background .15s' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <div style={{ width:34, height:34, borderRadius:11, background:'rgba(255,255,255,.22)', border:'1px solid rgba(255,255,255,.28)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <NavIcon name="target" active size={16} color="white" />
                </div>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:19, fontWeight:800, color:'white', lineHeight:1.02, letterSpacing:'-.03em' }}>CloserDebrief</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.76)', letterSpacing:'.2em', textTransform:'uppercase', fontWeight:800, marginTop:3 }}>Sales Intelligence</div>
                </div>
              </button>

              <div style={{ display:'flex', flexDirection:'column', gap:5, flex:1 }}>
                {navItems.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={()=>navigate(key)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      gap:8,
                      padding:'8px 10px',
                      borderRadius:12,
                      border:'none',
                      fontSize:12,
                      fontWeight:700,
                      cursor:'pointer',
                      transition:'all .18s',
                      background:page===key?'rgba(255,255,255,.24)':'transparent',
                      color:'white',
                      boxShadow:page===key?'0 10px 20px rgba(0,0,0,.16), inset 0 0 0 1px rgba(255,255,255,.28)':'none',
                      textAlign:'left',
                      width:'100%',
                    }}
                    onMouseEnter={e=>{ if(page!==key) e.currentTarget.style.background='rgba(255,255,255,.1)'; }}
                    onMouseLeave={e=>{ if(page!==key) e.currentTarget.style.background='transparent'; }}
                  >
                    <span style={{ width:20, height:20, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center', background:page===key?'rgba(255,255,255,.2)':'rgba(255,255,255,.1)' }}>
                      <NavIcon name={icon} active={page===key} size={15} color="white" />
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop:'1px solid rgba(255,255,255,.22)', paddingTop:10, marginTop:6, display:'grid', gap:4 }}>
                <button onClick={()=>setShowSettings(true)} style={{ display:'flex', alignItems:'center', gap:8, border:'none', background:'transparent', padding:'8px 10px', borderRadius:11, cursor:'pointer', color:'white', fontSize:12, fontWeight:700, textAlign:'left', fontFamily:'inherit', opacity:.95 }}>
                  <span style={{ width:20, height:20, borderRadius:8, background:'rgba(255,255,255,.14)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                    <NavIcon name="settings" size={14} color="white" />
                  </span>
                  Paramètres
                </button>
                <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:8, border:'none', background:'transparent', padding:'8px 10px', borderRadius:11, cursor:'pointer', color:'white', fontSize:12, fontWeight:700, textAlign:'left', fontFamily:'inherit', opacity:.95 }}>
                  <span style={{ width:20, height:20, borderRadius:8, background:'rgba(255,255,255,.14)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                    <NavIcon name="logout" size={14} color="white" />
                  </span>
                  Déconnexion
                </button>
              </div>
            </aside>

            <div style={{ flex:1, minWidth:0, marginLeft:DESKTOP_SIDEBAR_WIDTH, width:`calc(100vw - ${DESKTOP_SIDEBAR_WIDTH}px)` }}>
              <header style={{ position:'sticky', top:0, zIndex:45, minHeight:72, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, background:'rgba(245,237,230,.74)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,.42)' }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:'0 0 2px', fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:TXT3, fontWeight:700 }}>
                    CloserDebrief
                  </p>
                  <h2 style={{ margin:0, fontSize:18, color:TXT, fontWeight:800, lineHeight:1.2 }}>
                    {pageMeta.title}
                  </h2>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:TXT2 }}>
                    {pageMeta.subtitle}
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button style={{ width:34, height:34, borderRadius:12, border:'1px solid rgba(232,125,106,.2)', background:'rgba(255,255,255,.8)', cursor:'pointer', color:TXT2, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                    <NavIcon name="help" size={16} color={TXT2} />
                  </button>
                  <button
                    onClick={()=>setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    style={{ width:34, height:34, borderRadius:12, border:'1px solid rgba(232,125,106,.2)', background:'rgba(255,255,255,.8)', cursor:'pointer', color:TXT2, display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                    title="Basculer le thème"
                  >
                    <NavIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={16} color={TXT2} />
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

              <main style={{ padding:'28px 30px 40px', overflowX:'hidden', animation:'fadeUp .25s ease-out' }}>
                {dataLoading ? <Spinner full/> : Content()}
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
