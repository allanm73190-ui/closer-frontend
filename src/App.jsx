import React, { useState, useEffect } from 'react';

// ─── Config & Utils ──────────────────────────────────────────────────────────
import { apiFetch, getToken, clearToken, setOnExpired } from './config/api';
import { P, P2, TXT, TXT2, TXT3, R_MD, SH_BTN, SH_CARD, GLOBAL_CSS } from './styles/designSystem';
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
    { key:'Dashboard', label:'Dashboard', icon:'⊞' },
    { key:'Pipeline',  label:'Pipeline',  icon:'🎯' },
    { key:'Objections', label:'Objections', icon:'📚' },
    ...(isHOS ? [{ key:'HOSPage', label:'Équipe', icon:'👥' }] : []),
    { key:'NewDebrief', label:'Debrief',  icon:'📞' },
    { key:'History',   label:'Historique', icon:'🕐' },
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
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--txt,#5a4a3a)', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {burst && <Burst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel} onDone={()=>setBurst(null)}/>}
      <Toasts list={toasts}/>
      {showSettings && <AccountSettings user={user} onClose={()=>setShowSettings(false)} toast={toast}/>}

      {mob ? (
        <>
          <header style={{ position:'sticky', top:0, zIndex:50, background:'var(--sidebar)', borderBottom:'1px solid var(--border)', boxShadow:'var(--sh-sm)' }}>
            <div style={{ padding:'0 14px', display:'flex', alignItems:'center', justifyContent:'space-between', height:52 }}>
              <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>📞</div>
                <span style={{ fontSize:14, fontWeight:700, color:TXT }}>CloserDebrief</span>
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
          <main style={{ padding:'16px 14px 90px' }}>
            {dataLoading ? <Spinner full/> : Content()}
          </main>
          <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--sidebar)', borderTop:'1px solid var(--border)', boxShadow:'var(--sh-sm)', display:'flex', alignItems:'center', justifyContent:'space-around', padding:`6px 0 max(8px,env(safe-area-inset-bottom))`, zIndex:40 }}>
            {navItems.map(({ key, label, icon }) => (
              <button key={key} onClick={()=>navigate(key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'none', border:'none', cursor:'pointer', padding:'4px 10px', fontFamily:'inherit', flex:1 }}>
                <div style={{ width:36, height:28, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', boxShadow:page===key?SH_BTN:'none', transition:'all .2s' }}>{icon}</div>
                <span style={{ fontSize:10, fontWeight:600, color:page===key?P:TXT3 }}>{label}</span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <div style={{ display:'flex', minHeight:'100vh' }}>
          <aside style={{ width:220, flexShrink:0, position:'sticky', top:0, height:'100vh', display:'flex', flexDirection:'column', background:'var(--sidebar)', borderRight:'1px solid var(--border)', boxShadow:'var(--sh-sm)', padding:'18px 10px', zIndex:40 }}>
            <button onClick={()=>navigate('Dashboard')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:'10px 12px', borderRadius:R_MD, marginBottom:20, fontFamily:'inherit', width:'100%', transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--nav-hover)'}
              onMouseLeave={e=>e.currentTarget.style.background='none'}>
              <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${P},${P2})`, boxShadow:SH_BTN, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📞</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:TXT }}>CloserDebrief</div>
                <div style={{ fontSize:10, color:TXT3 }}>Sales OS</div>
              </div>
            </button>
            <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
              {navItems.map(({ key, label, icon }) => (
                <button key={key} onClick={()=>navigate(key)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:R_MD, border:'none', fontSize:13, fontWeight:page===key?700:500, cursor:'pointer', transition:'all .18s', background:page===key?`linear-gradient(135deg,${P},${P2})`:'transparent', color:page===key?'white':TXT2, boxShadow:page===key?SH_BTN:'none', fontFamily:'inherit', textAlign:'left', width:'100%' }}
                  onMouseEnter={e=>{ if(page!==key) e.currentTarget.style.background='var(--nav-hover)'; }}
                  onMouseLeave={e=>{ if(page!==key) e.currentTarget.style.background='transparent'; }}>
                  <span style={{ fontSize:16, width:22, textAlign:'center' }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8 }}>
              <UserMenu
                user={user}
                gam={gam}
                onLogout={onLogout}
                onSettings={()=>setShowSettings(true)}
                toast={toast}
                sidebar
                theme={theme}
                onToggleTheme={()=>setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              />
            </div>
          </aside>
          <main style={{ flex:1, minWidth:0, padding:'28px 40px', overflowX:'hidden', maxWidth:'calc(100vw - 220px)' }}>
            {dataLoading ? <Spinner full/> : Content()}
          </main>
        </div>
      )}
    </div>
  );
}
