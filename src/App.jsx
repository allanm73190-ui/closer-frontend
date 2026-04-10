import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';

// ─── Config & Utils ──────────────────────────────────────────────────────────
import { apiFetch, clearToken, setOnExpired } from './config/api';
import { P, P2, TXT, TXT2, TXT3, R_MD, SH_BTN, GLOBAL_CSS } from './styles/designSystem';
import { useIsMobile, useToast, useDebriefConfig } from './hooks';
import { normalizeDebriefTemplateCatalog, getDefaultTemplateCatalog } from './config/debriefTemplates';

// ─── UI Components ───────────────────────────────────────────────────────────
import { Toasts, Burst, Spinner } from './components/ui';
import { Icon } from './components/ui/Icon';

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
const GamificationPage = lazy(() => import('./components/gamification').then(m => ({ default: m.GamificationPage })));

function NavIcon({ name, active = false, size = 18, color = 'currentColor' }) {
  return (
    <Icon
      name={name}
      size={size}
      color={color}
      strokeWidth={active ? 2.2 : 1.9}
    />
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const { list: toasts, toast } = useToast();

  const [authView, setAuthView] = useState('login');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const VALID_PAGES = ['Dashboard','Pipeline','Objections','Benchmark','Knowledge','HOSPage','NewDebrief','History','Gamification','Settings','Detail','PdfViewer','EditDebrief'];
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('cd_page');
    return (saved && VALID_PAGES.includes(saved)) ? saved : 'Dashboard';
  });
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
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
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
      setUser(null); setDebriefs([]); setGam(null); setPage('Dashboard'); sessionStorage.removeItem('cd_page'); setAuthView('login');
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

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = () => setNotifOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [notifOpen]);

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    apiFetch('/notifications').then(data => setNotifications(Array.isArray(data) ? data : [])).catch(() => {});
  }, [user]);

  const markNotifRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (_) {}
  };

  const markAllNotifRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (_) {}
  };

  const navigate = (p, id = null, from = null, opts = {}) => {
    setPage(p); sessionStorage.setItem('cd_page', p); setSelId(id);
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
      setPendingDebriefLink(null); setNotifications([]);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    navigate(pendingDebriefLink.page || 'Detail', target.id, 'History');
    setPendingDebriefLink(null); setNotifications([]);
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
    setPendingDebriefLink(null); setNotifications([]);
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
    { key: 'Dashboard',  label: 'Dashboard',  icon: 'layout-dashboard',      section: 'Principal' },
    { key: 'Pipeline',   label: 'Pipeline',   icon: 'kanban' },
    { key: 'Objections', label: 'Objections', icon: 'message-square-warning' },
    { key: 'History',    label: 'Débriefs',   icon: 'file-text' },
    ...(isManager
      ? [
          { key: 'HOSPage',      label: 'Mon équipe',  icon: 'users',       section: 'Équipe' },
          { key: 'Gamification', label: 'Classement',  icon: 'trophy' },
        ]
      : [{ key: 'Gamification', label: 'Classement',  icon: 'trophy', section: 'Équipe' }]
    ),
    { key: 'Benchmark',  label: 'Benchmark',  icon: 'bar-chart-2',    section: 'Outils' },
    { key: 'Knowledge',  label: 'Connaissances', icon: 'book-open' },
  ];
  const mobileNavItems = [
    { key: 'Dashboard',     label: 'Dashboard',  icon: 'layout-dashboard' },
    { key: 'Pipeline',      label: 'Pipeline',   icon: 'kanban' },
    { key: 'Objections',    label: 'Objections', icon: 'message-square-warning' },
    { key: 'History',       label: 'Débriefs',   icon: 'file-text' },
    { key: 'Gamification',  label: 'Classement', icon: 'trophy' },
  ];
  const isPdfViewerPage = page === 'PdfViewer';
  const appSettingsValue = useMemo(() => ({ theme, autoAiAfterDebrief }), [theme, autoAiAfterDebrief]);
  const globalThemeStyle = <style>{GLOBAL_CSS}</style>;
  const unreadNotifications = notifications.filter(n => !n.read).length;

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
      {page === 'Gamification' && <GamificationPage gam={gam} user={user} debriefs={debriefs} />}
      {page === 'HOSPage' && isManager && <HOSPage toast={toast} allDebriefs={debriefs} />}
      {page === 'Settings' && (
        <SettingsPage user={user} toast={toast} navigate={navigate} fromPage={from || 'Dashboard'} returnId={selId}
          requestedTab={settingsTabRequest} debriefConfig={debriefConfig} setDebriefConfig={setDebriefConfig}
          debriefTemplates={debriefTemplates} setDebriefTemplates={setDebriefTemplates}
          appSettings={appSettingsValue} onSaveAppSettings={saveAppSettings} />
      )}
    </>
  );

  const renderContent = () => (dataLoading ? <Spinner full /> : <Suspense fallback={<Spinner full />}>{Content()}</Suspense>);
  const notificationsPanel = (
    <div
      style={{
        width: 340,
        maxHeight: 420,
        overflowY: 'auto',
        background: 'var(--card, #fff)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: 'var(--sh-card)',
        padding: '10px 0',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Notifications</span>
        {unreadNotifications > 0 && (
          <button onClick={markAllNotifRead} style={{ fontSize: 11, color: 'var(--txt3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Tout marquer lu
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--txt3)', textAlign: 'center', margin: '16px 0' }}>Aucune notification</p>
      ) : (
        notifications.map(n => (
          <div
            key={n.id}
            onClick={() => { markNotifRead(n.id); setNotifOpen(false); if (n.data?.dealId) navigate('Pipeline'); }}
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              background: n.read ? 'transparent' : 'rgba(66,133,244,.05)',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--nav-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(66,133,244,.05)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4285F4', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 3 }}>
                  {new Date(n.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
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
          <main style={{ minHeight: '100vh' }}>{renderContent()}</main>
        ) : mob ? (
          <>
            <header className="cd-mobile-top">
              <button
                onClick={() => navigate('Dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
              >
                <span className="cd-avatar">C</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--txt)', fontFamily: 'Manrope, Inter, sans-serif' }}>CloserDebrief</span>
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--glass-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)', position: 'relative' }}
                  title="Notifications"
                >
                  <NavIcon name="bell" size={15} color="var(--txt3)" />
                  {unreadNotifications > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                  )}
                </button>
                <button
                  onClick={toggleTheme}
                  style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--glass-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)' }}
                  title="Thème"
                >
                  <NavIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={15} color="var(--txt3)" />
                </button>
              </div>
            </header>

            {notifOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,18,28,.28)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 64 }} onClick={() => setNotifOpen(false)}>
                {notificationsPanel}
              </div>
            )}

            <main className="main" style={{ marginLeft: 0 }}>
              <div className="page active" style={{ display: 'block', padding: '18px 14px 86px' }}>
                {renderContent()}
              </div>
            </main>

            <nav className="bottom-nav">
              <div className="bottom-nav-inner">
                {mobileNavItems.map(({ key, label, icon }) => {
                  const isActive = page === key;
                  return (
                    <button
                      key={key}
                      onClick={() => navigate(key)}
                      className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                      style={{ border: 'none', background: 'none', fontFamily: 'inherit' }}
                    >
                      <NavIcon name={icon} active={isActive} size={15} color={isActive ? 'var(--accent)' : 'var(--txt3)'} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </>
        ) : (
          <div className="app">
            <nav className="sidebar">
              <div className="sidebar-logo">
                <button
                  onClick={() => navigate('Dashboard')}
                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <span className="logo-text">CloserDebrief</span>
                  <span className="logo-badge">Beta</span>
                </button>
              </div>
              <div className="sidebar-user">
                <div className="avatar">
                  {(user.name || 'U').substring(0, 1).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-level">{gam?.level?.name || 'Closer'}</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {navItems.map(({ key, label, icon, section }) => {
                  const isActive = page === key;
                  return (
                    <React.Fragment key={key}>
                      {section && <div className="nav-section-label">{section}</div>}
                      <button
                        onClick={() => navigate(key)}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                        style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                      >
                        <NavIcon name={icon} active={isActive} size={16} color={isActive ? 'var(--accent)' : 'var(--txt3)'} />
                        <span>{label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="sidebar-bottom">
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="nav-item"
                  style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <NavIcon name="bell" size={16} color="var(--txt3)" />
                  Notifications
                  {unreadNotifications > 0 && <span className="nav-badge">{unreadNotifications}</span>}
                </button>
                <button
                  onClick={toggleTheme}
                  className="nav-item"
                  style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <NavIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={16} color="var(--txt3)" />
                  Thème
                </button>
                <button
                  onClick={() => openSettings('account', ['Detail', 'EditDebrief'].includes(page) ? 'Dashboard' : page)}
                  className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <NavIcon name="settings" size={16} color={page === 'Settings' ? 'var(--accent)' : 'var(--txt3)'} />
                  Paramètres
                </button>
                <button
                  onClick={onLogout}
                  className="nav-item"
                  style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <NavIcon name="log-out" size={16} color="var(--txt3)" />
                  Déconnexion
                </button>
              </div>
            </nav>

            <main className="main">
              <div className="page active" style={{ display: 'block' }}>
                {renderContent()}
              </div>
            </main>

            {notifOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,18,28,.18)' }} onClick={() => setNotifOpen(false)}>
                <div style={{ position: 'fixed', top: 14, right: 16, zIndex: 10000 }}>
                  {notificationsPanel}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
