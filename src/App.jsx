import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';

// ─── Config & Utils ──────────────────────────────────────────────────────────
import { apiFetch, clearToken, setOnExpired } from './config/api';
import { P, P2, TXT, TXT2, TXT3, R_MD, SH_BTN, GLOBAL_CSS } from './styles/designSystem';
import { useIsMobile, useToast, useDebriefConfig } from './hooks';
import { normalizeDebriefTemplateCatalog, getDefaultTemplateCatalog } from './config/debriefTemplates';

// ─── UI Components ───────────────────────────────────────────────────────────
import { Toasts, Burst, Spinner } from './components/ui';
import { UserMenu } from './components/ui/UserMenu';

// ─── Auth ────────────────────────────────────────────────────────────────────
import { LoginPage, RegisterPage, ForgotPage, ResetPage } from './components/auth';

// ─── Pages (lazy-loaded) ────────────────────────────────────────────────────
const Dashboard        = lazy(() => import('./components/dashboard').then(m => ({ default: m.Dashboard })));
const History          = lazy(() => import('./components/dashboard').then(m => ({ default: m.History })));
const Detail           = lazy(() => import('./components/debrief/Detail').then(m => ({ default: m.Detail })));
const NewDebrief       = lazy(() => import('./components/debrief/NewDebrief').then(m => ({ default: m.NewDebrief })));
const PdfViewer        = lazy(() => import('./components/debrief/PdfViewer').then(m => ({ default: m.PdfViewer })));
const PipelinePage     = lazy(() => import('./components/pipeline').then(m => ({ default: m.PipelinePage })));
const HOSPage          = lazy(() => import('./components/team').then(m => ({ default: m.HOSPage })));
const ObjectionLibrary = lazy(() => import('./components/objections').then(m => ({ default: m.ObjectionLibrary })));
const SettingsPage     = lazy(() => import('./components/settings').then(m => ({ default: m.SettingsPage })));
const BenchmarkPage    = lazy(() => import('./components/features/Benchmark').then(m => ({ default: m.BenchmarkPage })));
const KnowledgePage    = lazy(() => import('./components/features/Knowledge').then(m => ({ default: m.KnowledgePage })));

const DESKTOP_SIDEBAR_WIDTH = 220;

const PAGE_META = {
  Dashboard:    { title:'Tableau de bord',   subtitle:'Performance globale et priorités du jour' },
  Pipeline:     { title:'Pipeline',          subtitle:'Suivi dynamique des opportunités en cours' },
  Objections:   { title:'Objections',        subtitle:'Bibliothèque active et réponses validées' },
  Benchmark:    { title:'Benchmark interne', subtitle:'Progression personnelle sans classement public' },
  Knowledge:    { title:'Centre de connaissances', subtitle:'Snippets validés et scripts réutilisables' },
  HOSPage:      { title:'Espace équipe',     subtitle:'Pilotage des équipes et objectifs HOS' },
  NewDebrief:   { title:'Nouveau debrief',   subtitle:'Capture structurée de votre dernier appel' },
  EditDebrief:  { title:'Modifier le debrief', subtitle:'Ajustez et enrichissez le débrief existant' },
  History:      { title:'Historique',         subtitle:'Retrouvez et filtrez vos debriefs passés' },
  Detail:       { title:'Détail debrief',    subtitle:'Analyse complète, IA et export PDF' },
  PdfViewer:    { title:'Visualisateur PDF', subtitle:'Rendu web fidèle et export prêt au téléchargement' },
  Settings:     { title:'Paramètres',        subtitle:'Configuration synchronisée de votre espace' },
};

function NavIcon({ name, active = false, size = 18, color = 'currentColor' }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        lineHeight: 1,
        color,
        fontVariationSettings: `'FILL' ${active ? 1 : 0}, 'wght' ${active ? 650 : 500}, 'GRAD' 0, 'opsz' 24`,
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState('Dashboard');
  const [selId, setSelId] = useState(null);
  const [from, setFrom] = useState(null);
  const [debriefs, setDebriefs] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [debriefsLoaded, setDebriefsLoaded] = useState(false);
  const [gam, setGam] = useState(null);
  const [resetToken, setResetToken] = useState(null);
  const [pendingDebriefLink, setPendingDebriefLink] = useState(null);
  const [burst, setBurst] = useState(null);
  const [autoAI, setAutoAI] = useState(false);
  const [autoAiAfterDebrief, setAutoAiAfterDebrief] = useState(true);
  const [leadContext, setLeadContext] = useState(null);
  const [settingsTabRequest, setSettingsTabRequest] = useState('account');
  const [objectivesRefreshTick, setObjectivesRefreshTick] = useState(0);
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
    if (rt) {
      setResetToken(rt);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const deepDebriefId = p.get('debrief_id');
    const wantsPdfViewer = p.get('pdf_view') === '1' || p.get('export') === '1';
    if (deepDebriefId) {
      setPendingDebriefLink({
        debriefId: deepDebriefId,
        page: wantsPdfViewer ? 'PdfViewer' : 'Detail',
      });
    }
  }, []);

  // Session expiry
  useEffect(() => {
    setOnExpired(() => {
      setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login');
      toast('Session expirée, veuillez vous reconnecter', 'error');
    });
  }, [toast]);

  // Restore session from httpOnly cookie
  useEffect(() => {
    apiFetch('/auth/me').then(setUser).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  // Load data
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    setDebriefsLoaded(false);
    Promise.all([apiFetch('/debriefs'), apiFetch('/gamification/me')])
      .then(([d, g]) => { setDebriefs(Array.isArray(d) ? d : (d?.data || [])); setGam(g); })
      .catch(err => toast(err.message, 'error'))
      .finally(() => {
        setDataLoading(false);
        setDebriefsLoaded(true);
      });
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cd_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/app-settings')
      .then(settings => {
        if (settings?.theme === 'dark' || settings?.theme === 'light') setTheme(settings.theme);
        if (typeof settings?.autoAiAfterDebrief === 'boolean') setAutoAiAfterDebrief(settings.autoAiAfterDebrief);
      })
      .catch(() => {});
  }, [user?.id]);

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

  const navigate = (p, id = null, from = null, opts = {}) => {
    setPage(p); setSelId(id);
    if (from) setFrom(from);
    else if (p !== 'Detail' && p !== 'PdfViewer') setFrom(null);
    setAutoAI(!!opts.autoAI);
    setLeadContext(opts.leadContext || null);
    if (opts.settingsTab) setSettingsTabRequest(opts.settingsTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user || !pendingDebriefLink || dataLoading || !debriefsLoaded) return;
    const targetId = String(pendingDebriefLink.debriefId || '');
    const target = debriefs.find(item => String(item.id) === targetId);
    if (!target) {
      toast('Debrief introuvable pour ce lien', 'error');
      setPendingDebriefLink(null);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    navigate(pendingDebriefLink.page || 'Detail', target.id, 'History');
    setPendingDebriefLink(null);
    window.history.replaceState({}, '', window.location.pathname);
  }, [user, pendingDebriefLink, dataLoading, debriefsLoaded, debriefs, toast]);

  const saveAppSettings = async (nextSettings, options = {}) => {
    const { silent = false } = options;
    const payload = {
      theme: nextSettings?.theme === 'dark' ? 'dark' : 'light',
      autoAiAfterDebrief: typeof nextSettings?.autoAiAfterDebrief === 'boolean'
        ? nextSettings.autoAiAfterDebrief : autoAiAfterDebrief,
    };
    try {
      const saved = await apiFetch('/app-settings', { method: 'PUT', body: payload });
      setTheme(saved?.theme === 'dark' ? 'dark' : 'light');
      setAutoAiAfterDebrief(typeof saved?.autoAiAfterDebrief === 'boolean' ? saved.autoAiAfterDebrief : payload.autoAiAfterDebrief);
      return saved;
    } catch (e) {
      if (!silent) toast(e.message, 'error');
      throw e;
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    apiFetch('/app-settings', { method: 'PUT', body: { theme: nextTheme, autoAiAfterDebrief } }).catch(() => {});
  };

  const openSettings = (tab = 'account', origin = page) => {
    const keepId = ['Detail', 'EditDebrief'].includes(origin) ? selId : null;
    navigate('Settings', keepId, origin, { settingsTab: tab });
  };

  const onLogin = (u, g) => { setUser(u); if (g) setGam(g); setPage('Dashboard'); toast(`Bienvenue, ${u.name} !`); };
  const onLogout = async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    clearToken();
    setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); setAuthView('login');
    setDebriefsLoaded(false);
    setAutoAiAfterDebrief(true); setSettingsTabRequest('account');
    setPendingDebriefLink(null);
    toast('Déconnecté');
  };

  const onSave = (debrief, g) => {
    setDebriefs(p => [debrief, ...p]);
    setObjectivesRefreshTick(t => t + 1);
    if (g) { setGam(g); if (g.pointsEarned > 0) setBurst({ points: g.pointsEarned, levelUp: g.levelUp, newLevel: g.level.name }); }
  };

  const onUpdateDebrief = (debrief, g) => {
    setDebriefs(prev => prev.map(d => d.id === debrief.id ? debrief : d));
    if (g) setGam(g);
  };

  const onDelete = async id => {
    if (!confirm('Supprimer ce debrief ?')) return;
    try {
      const r = await apiFetch(`/debriefs/${id}`, { method: 'DELETE' });
      setDebriefs(p => p.filter(d => d.id !== id));
      if (r.gamification) setGam(r.gamification);
      toast('Debrief supprimé');
      navigate(from || 'Dashboard');
    } catch (e) { toast(e.message, 'error'); }
  };

  const selDebrief = debriefs.find(d => d.id === selId);
  const role = user?.role || 'closer';
  const isAdmin = role === 'admin';
  const isHOS = role === 'head_of_sales';
  const isManager = isAdmin || isHOS;
  const navItems = [
    { key: 'Dashboard',  label: 'Dashboard',  icon: 'dashboard' },
    { key: 'Pipeline',   label: 'Pipeline',   icon: 'analytics' },
    { key: 'Objections', label: 'Objections',  icon: 'forum' },
    { key: 'Benchmark',  label: 'Benchmark', icon: 'query_stats' },
    { key: 'Knowledge',  label: 'Connaissances', icon: 'library_books' },
    ...(isManager ? [{ key: 'HOSPage', label: 'Équipe', icon: 'groups' }] : []),
    { key: 'NewDebrief', label: 'Debrief',    icon: 'add_circle' },
    { key: 'History',    label: 'Historique',  icon: 'history' },
  ];
  const mobileNavItems = [
    { key: 'Dashboard',  label: 'Dashboard',  icon: 'dashboard' },
    { key: 'Pipeline',   label: 'Pipeline',   icon: 'analytics' },
    { key: 'Objections', label: 'Objections', icon: 'forum' },
    { key: 'NewDebrief', label: 'Debrief',    icon: 'add_circle' },
    { key: 'History',    label: 'Historique', icon: 'history' },
  ];
  const pageMeta = PAGE_META[page] || PAGE_META.Dashboard;
  const isPdfViewerPage = page === 'PdfViewer';
  const appSettingsValue = useMemo(() => ({ theme, autoAiAfterDebrief }), [theme, autoAiAfterDebrief]);
  const globalThemeStyle = <style>{GLOBAL_CSS}</style>;

  // ─── Auth gates ────────────────────────────────────────────────────────────
  if (authLoading) return (
    <>
      {globalThemeStyle}
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg, linear-gradient(160deg,#f5ede6 0%,#e8f0f5 100%))' }}>
        <Spinner />
      </div>
    </>
  );
  if (resetToken) return (
    <>
      {globalThemeStyle}
      <ResetPage token={resetToken} onDone={() => { setResetToken(null); setAuthView('login'); toast('Mot de passe modifié !'); }} />
    </>
  );
  if (!user) {
    if (authView === 'register') return (
      <>
        {globalThemeStyle}
        <RegisterPage onLogin={onLogin} goLogin={() => setAuthView('login')} />
      </>
    );
    if (authView === 'forgot') return (
      <>
        {globalThemeStyle}
        <ForgotPage goLogin={() => setAuthView('login')} />
      </>
    );
    return (
      <>
        {globalThemeStyle}
        <LoginPage onLogin={onLogin} goRegister={() => setAuthView('register')} goForgot={() => setAuthView('forgot')} />
      </>
    );
  }

  // ─── Content renderer ──────────────────────────────────────────────────────
  const Content = () => (
    <>
      {page === 'Dashboard' && <Dashboard debriefs={debriefs} navigate={navigate} user={user} gam={gam} toast={toast} objectivesRefreshTick={objectivesRefreshTick} />}
      {page === 'NewDebrief' && (
        <NewDebrief navigate={navigate} onSave={onSave} onUpdate={onUpdateDebrief} toast={toast} user={user}
          debriefConfig={debriefConfig} debriefTemplates={debriefTemplates} leadContext={leadContext} autoAiAfterSave={autoAiAfterDebrief} />
      )}
      {page === 'EditDebrief' && (
        <NewDebrief navigate={navigate} onSave={onSave} onUpdate={onUpdateDebrief} toast={toast} user={user}
          debriefConfig={debriefConfig} debriefTemplates={debriefTemplates} existingDebrief={selDebrief} fromPage={from || 'History'} autoAiAfterSave={autoAiAfterDebrief} />
      )}
      {page === 'History' && <History debriefs={debriefs} navigate={navigate} user={user} />}
      {page === 'Detail' && <Detail debrief={selDebrief} navigate={navigate} onDelete={onDelete} fromPage={from} user={user} toast={toast} allDebriefs={debriefs} autoAI={autoAI} />}
      {page === 'PdfViewer' && <PdfViewer debrief={selDebrief} allDebriefs={debriefs} user={user} toast={toast} navigate={navigate} />}
      {page === 'Pipeline' && <PipelinePage user={user} toast={toast} debriefs={debriefs} navigate={navigate} />}
      {page === 'Objections' && <ObjectionLibrary toast={toast} />}
      {page === 'Benchmark' && <BenchmarkPage user={user} debriefs={debriefs} navigate={navigate} toast={toast} />}
      {page === 'Knowledge' && <KnowledgePage navigate={navigate} toast={toast} />}
      {page === 'HOSPage' && isManager && <HOSPage toast={toast} allDebriefs={debriefs} />}
      {page === 'Settings' && (
        <SettingsPage user={user} toast={toast} navigate={navigate} fromPage={from || 'Dashboard'} returnId={selId}
          requestedTab={settingsTabRequest} debriefConfig={debriefConfig} setDebriefConfig={setDebriefConfig}
          debriefTemplates={debriefTemplates} setDebriefTemplates={setDebriefTemplates}
          appSettings={appSettingsValue} onSaveAppSettings={saveAppSettings} />
      )}
    </>
  );

  // ─── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--txt, #4A3428)', position: 'relative', overflow: 'hidden' }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Floating gradient blobs ─────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: -120, right: -80, width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--float-blob-1) 0%, transparent 72%)',
          animation: 'floatY 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: -140, left: -100, width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--float-blob-2) 0%, transparent 72%)',
          animation: 'floatY 16s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--float-blob-3) 0%, transparent 72%)',
          animation: 'floatY 20s ease-in-out infinite',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {burst && <Burst points={burst.points} levelUp={burst.levelUp} newLevel={burst.newLevel} onDone={() => setBurst(null)} />}
        <Toasts list={toasts} />

        {isPdfViewerPage ? (
          <main style={{ minHeight: '100vh' }}>
            {dataLoading ? <Spinner full /> : <Suspense fallback={<Spinner full />}>{Content()}</Suspense>}
          </main>
        ) : mob ? (
          /* ─── MOBILE LAYOUT ─────────────────────────────────────────────── */
          <>
            <header style={{
              position: 'sticky', top: 0, zIndex: 50,
              background: 'var(--sidebar)',
              borderBottom: '1px solid var(--sidebar-border)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}>
              <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 54 }}>
                <button onClick={() => navigate('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: 'white',
                  }}>C</div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--txt)', lineHeight: 1.1 }}>CloserDebrief</span>
                    <span style={{ display: 'block', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--txt3)' }}>Sales Intelligence</span>
                  </div>
                </button>
                <UserMenu user={user} gam={gam} onLogout={onLogout}
                  onSettings={() => openSettings('account', ['Detail', 'EditDebrief'].includes(page) ? 'Dashboard' : page)}
                  toast={toast} theme={theme} onToggleTheme={toggleTheme} />
              </div>
            </header>

            <main style={{ padding: '18px 14px 104px' }}>
              {dataLoading ? <Spinner full /> : <Suspense fallback={<Spinner full />}>{Content()}</Suspense>}
            </main>

            {/* ── Mobile bottom nav ────────────────────────────────────────── */}
            <nav style={{
              position: 'fixed', left: 10, right: 10,
              bottom: 'max(10px, env(safe-area-inset-bottom))',
              background: 'var(--sidebar)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 16,
              boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-around',
              padding: '6px 4px', zIndex: 45,
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}>
              {mobileNavItems.map(({ key, label, icon }) => (
                <button key={key} onClick={() => navigate(key)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit', flex: 1,
                }}>
                  <div style={{
                    minWidth: 32, height: 28, borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: page === key ? 'var(--gradient-primary)' : 'transparent',
                    color: page === key ? 'white' : 'var(--txt2)',
                    boxShadow: page === key ? SH_BTN : 'none',
                    transition: 'all .2s',
                  }}>
                    <NavIcon name={icon} active={page === key} size={16} color={page === key ? 'white' : 'var(--txt2)'} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: page === key ? P : 'var(--txt3)' }}>{label}</span>
                </button>
              ))}
            </nav>
          </>
        ) : (
          /* ─── DESKTOP LAYOUT ────────────────────────────────────────────── */
          <div style={{ display: 'flex', minHeight: '100vh' }}>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside style={{
              width: DESKTOP_SIDEBAR_WIDTH, flexShrink: 0,
              position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 60,
              display: 'flex', flexDirection: 'column',
              background: 'var(--sidebar)',
              borderRight: '1px solid var(--sidebar-border)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              padding: 0,
            }}>
              {/* Logo section */}
              <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => navigate('Dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontSize: 13, fontWeight: 700 }}>C</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Manrope, Inter, sans-serif', background: 'linear-gradient(135deg, var(--accent), var(--accent-violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-.3px' }}>CloserDebrief</div>
                    <div style={{ fontSize: 9, color: 'var(--txt3)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 600 }}>Sales Intelligence</div>
                  </div>
                </button>
              </div>

              {/* User section */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-violet), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {(user.name || 'U').substring(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: P, fontWeight: 600 }}>{gam?.level?.icon || ''} {gam?.level?.name || 'Découvreur'}</div>
                </div>
              </div>

              {/* Nav items */}
              <div style={{ flex: 1, paddingTop: 6, paddingBottom: 6 }}>
                {navItems.map(({ key, label, icon }) => {
                  const isActive = page === key;
                  return (
                    <button
                      key={key}
                      onClick={() => navigate(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', borderRadius: 0, border: 'none',
                        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                        fontSize: 13, fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer', transition: 'all .15s',
                        background: isActive ? 'rgba(255,126,95,.10)' : 'transparent',
                        color: isActive ? P : 'var(--txt3)',
                        textAlign: 'left', width: '100%', fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--nav-hover)'; e.currentTarget.style.color = 'var(--txt)'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--txt3)'; } }}
                    >
                      <NavIcon name={icon} active={isActive} size={16} color={isActive ? P : 'var(--txt3)'} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom sidebar */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 4, paddingBottom: 4 }}>
                <button
                  onClick={() => openSettings('account', ['Detail', 'EditDebrief'].includes(page) ? 'Dashboard' : page)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, border: 'none',
                    background: page === 'Settings' ? 'rgba(255,126,95,.10)' : 'transparent',
                    padding: '9px 16px', borderRadius: 0, borderLeft: page === 'Settings' ? '3px solid var(--accent)' : '3px solid transparent', cursor: 'pointer',
                    color: page === 'Settings' ? P : 'var(--txt3)',
                    fontSize: 13, fontWeight: page === 'Settings' ? 600 : 500,
                    textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <NavIcon name="settings" size={16} color={page === 'Settings' ? P : 'var(--txt3)'} />
                  Paramètres
                </button>
                <button
                  onClick={onLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, border: 'none',
                    background: 'transparent', padding: '9px 16px', borderRadius: 0, borderLeft: '3px solid transparent',
                    cursor: 'pointer', color: 'var(--txt3)', fontSize: 13, fontWeight: 500,
                    textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <NavIcon name="logout" size={16} color="var(--txt3)" />
                  Déconnexion
                </button>
              </div>
            </aside>

            {/* ── Main area ────────────────────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0, marginLeft: DESKTOP_SIDEBAR_WIDTH, width: `calc(100vw - ${DESKTOP_SIDEBAR_WIDTH}px)` }}>

              {/* Topbar */}
              <header style={{
                position: 'sticky', top: 0, zIndex: 45,
                minHeight: 64, padding: '12px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
                background: 'var(--card-soft)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 1px', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 600 }}>
                    CloserDebrief
                  </p>
                  <h2 style={{ margin: 0, fontSize: 20, color: 'var(--txt)', fontWeight: 800, fontFamily: 'Manrope, Inter, sans-serif', lineHeight: 1.2, letterSpacing: '-.02em' }}>
                    {pageMeta.title}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--txt2)' }}>
                    {pageMeta.subtitle}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={{
                    width: 32, height: 32, borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--glass-bg)',
                    cursor: 'pointer', color: 'var(--txt2)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  }}>
                    <NavIcon name="help" size={15} color="var(--txt3)" />
                  </button>
                  <button
                    onClick={toggleTheme}
                    style={{
                      width: 32, height: 32, borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--glass-bg)',
                      cursor: 'pointer', color: 'var(--txt2)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                    }}
                    title="Basculer le thème"
                  >
                    <NavIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={15} color="var(--txt3)" />
                  </button>
                  <UserMenu user={user} gam={gam} onLogout={onLogout}
                    onSettings={() => openSettings('account', ['Detail', 'EditDebrief'].includes(page) ? 'Dashboard' : page)}
                    toast={toast} theme={theme} onToggleTheme={toggleTheme} />
                </div>
              </header>

              {/* Page content */}
              <main style={{ padding: '24px 26px 40px', overflowX: 'hidden', animation: 'fadeUp .25s ease-out' }}>
                {dataLoading ? <Spinner full /> : <Suspense fallback={<Spinner full />}>{Content()}</Suspense>}
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
