import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { DEFAULT_PIPELINE_CONFIG, LEAD_FIELD_OPTIONS, makeStatusKey, normalizePipelineConfig } from '../../config/pipeline';
import { getDefaultTemplateCatalog, normalizeDebriefTemplateCatalog } from '../../config/debriefTemplates';
import { DebriefConfigEditor } from '../debrief/Settings';
import { AlertBox, Btn, Card, Input, Spinner, Textarea } from '../ui';

const G = (extra = {}) => ({ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', ...extra });

const TEMPLATE_MIN_DESCRIPTION = 'Template personnalisé pour votre équipe.';

function resolveSettingsTab(tabs, requested, fallback = 'account') {
  if (requested && tabs.some(tab => tab.key === requested)) return requested;
  if (tabs.some(tab => tab.key === fallback)) return fallback;
  return tabs[0]?.key || 'account';
}

function fieldLabelByKey(key) {
  return LEAD_FIELD_OPTIONS.find(field => field.key === key)?.label || key;
}

function AccountSettingsSection({ user, toast }) {
  const isCloser = user.role === 'closer';
  const role = String(user?.role || '').toLowerCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'head_of_sales' ? 'Head of Sales' : 'Closer';
  const roleColor = role === 'admin' ? '#7C3AED' : role === 'head_of_sales' ? '#D97706' : '#7C3AED';
  const [teamLoading, setTeamLoading] = useState(isCloser);
  const [team, setTeam] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const loadTeam = useCallback(async () => {
    if (!isCloser) return;
    setTeamLoading(true);
    try {
      const data = await apiFetch('/teams/me');
      setTeam(data.team || null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setTeamLoading(false);
    }
  }, [isCloser, toast]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const joinTeam = async () => {
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) return;
    setJoining(true);
    try {
      const data = await apiFetch('/teams/join-with-code', {
        method:'POST',
        body:{ invite_code: normalizedCode },
      });
      setTeam(data.team || null);
      setInviteCode('');
      toast(`Équipe rejointe: ${data.team?.name || 'OK'}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setJoining(false);
    }
  };

  const changePassword = async () => {
    setPwdError('');
    if (pwd.next.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir 8 caractères minimum.');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError('La confirmation du mot de passe ne correspond pas.');
      return;
    }
    setPwdSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method:'POST',
        body:{ currentPassword: pwd.current, newPassword: pwd.next },
      });
      setPwd({ current:'', next:'', confirm:'' });
      toast('Mot de passe mis à jour');
    } catch (e) {
      setPwdError(e.message);
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Card style={{ padding:16 }}>
        <p style={{ margin:'0 0 6px', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:DS.textMuted, fontWeight:700 }}>Profil</p>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--gradient-primary)', color:'white', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ margin:0, fontSize:16, fontWeight:700, color:'var(--txt,#4A3428)' }}>{user.name}</p>
            <p style={{ margin:'2px 0 0', fontSize:13, color:DS.textMuted }}>{user.email}</p>
            <p style={{ margin:'4px 0 0', fontSize:11, fontWeight:700, color:roleColor }}>
              {roleLabel}
            </p>
          </div>
        </div>
      </Card>

      {isCloser && (
        <Card style={{ padding:16 }}>
          <p style={{ margin:'0 0 10px', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:DS.textMuted, fontWeight:700 }}>Équipe</p>
          {teamLoading ? (
            <Spinner size={20} />
          ) : (
            <>
              <p style={{ margin:'0 0 10px', fontSize:13, color:'var(--txt,#4A3428)' }}>
                Équipe actuelle: <strong>{team?.name || 'Aucune équipe'}</strong>
              </p>
              <div style={{ display:'flex', gap:8 }}>
                <Input
                  placeholder="Code d'invitation"
                  value={inviteCode}
                  onChange={e=>setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={e=>{ if (e.key === 'Enter') joinTeam(); }}
                />
                <Btn onClick={joinTeam} disabled={joining || !inviteCode.trim()}>
                  {joining ? 'Connexion...' : 'Rejoindre'}
                </Btn>
              </div>
            </>
          )}
        </Card>
      )}

      <Card style={{ padding:16 }}>
        <p style={{ margin:'0 0 10px', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:DS.textMuted, fontWeight:700 }}>Sécurité</p>
        <AlertBox type="error" message={pwdError} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--txt,#4A3428)', marginBottom:5 }}>Mot de passe actuel</label>
            <Input type="password" value={pwd.current} onChange={e=>setPwd(prev => ({ ...prev, current:e.target.value }))} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--txt,#4A3428)', marginBottom:5 }}>Nouveau mot de passe</label>
            <Input type="password" value={pwd.next} onChange={e=>setPwd(prev => ({ ...prev, next:e.target.value }))} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, color:'var(--txt,#4A3428)', marginBottom:5 }}>Confirmer</label>
            <Input type="password" value={pwd.confirm} onChange={e=>setPwd(prev => ({ ...prev, confirm:e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <Btn onClick={changePassword} disabled={pwdSaving || !pwd.current || !pwd.next || !pwd.confirm}>
            {pwdSaving ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

function AppPreferencesSection({ appSettings, onSaveAppSettings, toast }) {
  const [draft, setDraft] = useState(appSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(appSettings);
  }, [appSettings]);

  const save = async () => {
    setSaving(true);
    try {
      await onSaveAppSettings(draft, { silent:true });
      toast('Préférences enregistrées');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <Card style={{ padding:16 }}>
        <p style={{ margin:'0 0 8px', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:DS.textMuted, fontWeight:700 }}>Thème</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { key:'light', label:'Mode clair' },
            { key:'dark', label:'Mode nuit' },
          ].map(item => (
            <button
              key={item.key}
              type="button"
              onClick={()=>setDraft(prev => ({ ...prev, theme:item.key }))}
              style={{
                border:'1px solid var(--border)',
                borderRadius:999,
                padding:'8px 12px',
                fontSize:12,
                fontWeight:700,
                fontFamily:'inherit',
                cursor:'pointer',
                background:draft.theme === item.key ? 'var(--gradient-primary)' : 'var(--card,#fff)',
                color:draft.theme === item.key ? 'white' : 'var(--txt,#4A3428)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <Card style={{ padding:16 }}>
        <p style={{ margin:'0 0 8px', fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:DS.textMuted, fontWeight:700 }}>Debrief IA</p>
        <button
          type="button"
          onClick={()=>setDraft(prev => ({ ...prev, autoAiAfterDebrief: !prev.autoAiAfterDebrief }))}
          style={{
            width:'100%',
            border:'1px solid var(--border)',
            borderRadius:12,
            background:'var(--glass-bg)',
            padding:'12px 14px',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            fontFamily:'inherit',
            cursor:'pointer',
          }}
        >
          <span style={{ textAlign:'left' }}>
            <span style={{ display:'block', fontSize:13, fontWeight:700, color:'var(--txt,#4A3428)' }}>
              Lancer automatiquement l’analyse IA après enregistrement
            </span>
          </span>
          <span style={{ fontSize:13, fontWeight:700, color:draft.autoAiAfterDebrief ? '#059669' : DS.textMuted }}>
            {draft.autoAiAfterDebrief ? 'Activé' : 'Désactivé'}
          </span>
        </button>
      </Card>

      <div>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
        </Btn>
      </div>
    </div>
  );
}

function DebriefTemplatesSection({ debriefTemplates, setDebriefTemplates, toast }) {
  const [catalog, setCatalog] = useState(() => normalizeDebriefTemplateCatalog(debriefTemplates || getDefaultTemplateCatalog()));
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setCatalog(normalizeDebriefTemplateCatalog(debriefTemplates || getDefaultTemplateCatalog()));
  }, [debriefTemplates]);

  const updateTemplate = (idx, patch) => {
    setCatalog(prev => ({
      ...prev,
      templates: prev.templates.map((template, templateIdx) => templateIdx === idx ? { ...template, ...patch } : template),
    }));
  };

  const removeTemplate = (key) => {
    setCatalog(prev => {
      const nextTemplates = prev.templates.filter(template => template.key !== key);
      if (nextTemplates.length === 0) return prev;
      const nextDefault = nextTemplates.some(template => template.key === prev.defaultTemplateKey)
        ? prev.defaultTemplateKey
        : nextTemplates[0].key;
      return { ...prev, templates: nextTemplates, defaultTemplateKey: nextDefault };
    });
  };

  const addTemplate = () => {
    setCatalog(prev => {
      const label = `Template ${prev.templates.length + 1}`;
      const baseKey = makeStatusKey(label, `template_${prev.templates.length + 1}`);
      let nextKey = baseKey;
      let suffix = 2;
      while (prev.templates.some(template => template.key === nextKey)) {
        nextKey = `${baseKey}_${suffix}`;
        suffix += 1;
      }
      return {
        ...prev,
        templates: [
          ...prev.templates,
          {
            key: nextKey,
            label,
            description: TEMPLATE_MIN_DESCRIPTION,
            aiFocus: 'Analyse équilibrée du debrief.',
          },
        ],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = normalizeDebriefTemplateCatalog(catalog);
      const saved = await apiFetch('/debrief-templates', { method:'PUT', body: payload });
      const normalized = normalizeDebriefTemplateCatalog(saved);
      setCatalog(normalized);
      setDebriefTemplates(normalized);
      toast('Templates debrief sauvegardés');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('Réinitialiser les templates debrief ?')) return;
    setResetting(true);
    try {
      const fallback = await apiFetch('/debrief-templates', { method:'DELETE' });
      const normalized = normalizeDebriefTemplateCatalog(fallback || getDefaultTemplateCatalog());
      setCatalog(normalized);
      setDebriefTemplates(normalized);
      toast('Templates réinitialisés');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card style={{ padding:14 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn variant="secondary" onClick={addTemplate}>+ Ajouter un template</Btn>
          <Btn variant="danger" onClick={reset} disabled={resetting}>{resetting ? 'Réinitialisation...' : 'Réinitialiser'}</Btn>
        </div>
      </Card>

      {catalog.templates.map((template, idx) => (
        <Card key={template.key} style={{ padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:10 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--txt,#4A3428)', fontWeight:700 }}>
              <input
                type="radio"
                name="default_template"
                checked={catalog.defaultTemplateKey === template.key}
                onChange={()=>setCatalog(prev => ({ ...prev, defaultTemplateKey: template.key }))}
              />
              Template par défaut
            </label>
            <Btn
              variant="danger"
              onClick={()=>removeTemplate(template.key)}
              disabled={catalog.templates.length <= 1}
              style={{ fontSize:11, padding:'6px 10px' }}
            >
              Supprimer
            </Btn>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
            <div>
              <label style={{ display:'block', fontSize:11, color:DS.textMuted, marginBottom:5 }}>Clé</label>
              <Input value={template.key} onChange={e=>updateTemplate(idx, { key: e.target.value })} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:11, color:DS.textMuted, marginBottom:5 }}>Label</label>
              <Input value={template.label} onChange={e=>updateTemplate(idx, { label: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop:10 }}>
            <label style={{ display:'block', fontSize:11, color:DS.textMuted, marginBottom:5 }}>Description</label>
            <Textarea rows={2} value={template.description} onChange={e=>updateTemplate(idx, { description: e.target.value })} />
          </div>
          <div style={{ marginTop:10 }}>
            <label style={{ display:'block', fontSize:11, color:DS.textMuted, marginBottom:5 }}>Focus IA</label>
            <Textarea rows={2} value={template.aiFocus || ''} onChange={e=>updateTemplate(idx, { aiFocus: e.target.value })} />
          </div>
        </Card>
      ))}

      <div>
        <Btn onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder les templates'}</Btn>
      </div>
    </div>
  );
}

function PipelineSettingsSection({ toast }) {
  const [draft, setDraft] = useState(DEFAULT_PIPELINE_CONFIG);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([apiFetch('/pipeline-config'), apiFetch('/deals')])
      .then(([config, list]) => {
        if (!mounted) return;
        setDraft(normalizePipelineConfig(config || DEFAULT_PIPELINE_CONFIG));
        setDeals(Array.isArray(list) ? list : (list?.data || []));
      })
      .catch(e => {
        if (!mounted) return;
        setDraft(DEFAULT_PIPELINE_CONFIG);
        toast(e.message, 'error');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [toast]);

  const statusesInUse = useMemo(
    () => new Set((deals || []).map(deal => deal.status).filter(Boolean)),
    [deals]
  );

  const updateStatus = (idx, patch) => {
    setDraft(prev => ({
      ...prev,
      statuses: prev.statuses.map((status, statusIdx) => statusIdx === idx ? { ...status, ...patch } : status),
    }));
  };

  const removeStatus = (idx) => {
    setDraft(prev => {
      if (prev.statuses.length <= 1) return prev;
      return {
        ...prev,
        statuses: prev.statuses.filter((_, statusIdx) => statusIdx !== idx),
      };
    });
  };

  const moveStatus = (idx, direction) => {
    setDraft(prev => {
      const next = [...prev.statuses];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...prev, statuses: next };
    });
  };

  const addStatus = () => {
    setDraft(prev => {
      const label = `Nouveau statut ${prev.statuses.length + 1}`;
      const key = makeStatusKey(label, `status_${prev.statuses.length + 1}`);
      return {
        ...prev,
        statuses: [...prev.statuses, { key, label, icon:'🧩', color:'#64748b', bg:'#e2e8f0', closed:false, won:false }],
      };
    });
  };

  const toggleImportantField = (fieldKey) => {
    setDraft(prev => {
      const set = new Set(prev.importantFields || []);
      if (set.has(fieldKey)) set.delete(fieldKey);
      else set.add(fieldKey);
      return { ...prev, importantFields:[...set] };
    });
  };

  const save = async (configToSave = draft) => {
    setSaving(true);
    try {
      const payload = normalizePipelineConfig(configToSave);
      const saved = await apiFetch('/pipeline-config', { method:'PUT', body: payload });
      setDraft(normalizePipelineConfig(saved || payload));
      toast('Paramètres pipeline sauvegardés');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('Réinitialiser la configuration pipeline ?')) return;
    await save(DEFAULT_PIPELINE_CONFIG);
  };

  if (loading) {
    return (
      <Card style={{ padding:16 }}>
        <Spinner size={22} />
      </Card>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card style={{ padding:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8 }}>
            <Btn variant="secondary" onClick={addStatus} style={{ fontSize:12, padding:'7px 11px' }}>+ Statut</Btn>
            <Btn variant="danger" onClick={reset} style={{ fontSize:12, padding:'7px 11px' }}>Réinitialiser</Btn>
          </div>
        </div>
      </Card>

      <Card style={{ padding:14 }}>
        <p style={{ margin:'0 0 10px', fontSize:12, color:'var(--txt,#4A3428)', fontWeight:700 }}>Champs visibles dans la fiche contact</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:8 }}>
          {LEAD_FIELD_OPTIONS.map(field => {
            const active = (draft.importantFields || []).includes(field.key);
            return (
              <button
                key={field.key}
                type="button"
                onClick={()=>toggleImportantField(field.key)}
                style={{
                  border:'1px solid var(--border)',
                  borderRadius:10,
                  padding:'9px 10px',
                  background:active ? 'var(--surface-accent)' : 'var(--card,#fff)',
                  color:active ? 'var(--txt,#4A3428)' : DS.textMuted,
                  fontSize:12,
                  fontWeight:700,
                  textAlign:'left',
                  cursor:'pointer',
                  fontFamily:'inherit',
                }}
              >
                {active ? '✓ ' : ''}{field.label}
              </button>
            );
          })}
        </div>
      </Card>

      {draft.statuses.map((status, idx) => (
        <Card key={`${status.key}_${idx}`} style={{ padding:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 1fr', gap:8, marginBottom:10 }}>
            <Input value={status.icon} onChange={e=>updateStatus(idx, { icon:e.target.value })} />
            <Input value={status.label} onChange={e=>updateStatus(idx, { label:e.target.value })} />
            <Input value={status.key} onChange={e=>updateStatus(idx, { key:e.target.value })} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <label style={{ fontSize:11, color:DS.textMuted }}>Couleur</label>
              <input type="color" value={status.color} onChange={e=>updateStatus(idx, { color:e.target.value })} />
              <label style={{ fontSize:11, color:DS.textMuted }}>Fond</label>
              <input type="color" value={status.bg?.startsWith('#') ? status.bg : '#f1f5f9'} onChange={e=>updateStatus(idx, { bg:e.target.value })} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <label style={{ fontSize:11, color:DS.textMuted }}>
                <input type="checkbox" checked={!!status.closed} onChange={e=>updateStatus(idx, { closed:e.target.checked })} /> Clôturé
              </label>
              <label style={{ fontSize:11, color:DS.textMuted }}>
                <input type="checkbox" checked={!!status.won} onChange={e=>updateStatus(idx, { won:e.target.checked, closed:e.target.checked ? true : status.closed })} /> Gagné
              </label>
            </div>
          </div>
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <p style={{ margin:0, fontSize:11, color:statusesInUse.has(status.key) ? '#d97706' : DS.textMuted }}>
              {statusesInUse.has(status.key) ? 'Statut utilisé par des contacts' : 'Aucun contact sur ce statut'}
            </p>
            <div style={{ display:'flex', gap:6 }}>
              <Btn variant="secondary" onClick={()=>moveStatus(idx, -1)} style={{ fontSize:11, padding:'5px 8px' }}>↑</Btn>
              <Btn variant="secondary" onClick={()=>moveStatus(idx, 1)} style={{ fontSize:11, padding:'5px 8px' }}>↓</Btn>
              <Btn variant="danger" onClick={()=>removeStatus(idx)} style={{ fontSize:11, padding:'5px 8px' }}>Suppr.</Btn>
            </div>
          </div>
        </Card>
      ))}

      <div>
        <Btn onClick={()=>save()} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder le pipeline'}</Btn>
      </div>
    </div>
  );
}

function SettingsPage({
  user,
  toast,
  navigate,
  fromPage,
  returnId,
  requestedTab,
  debriefConfig,
  setDebriefConfig,
  debriefTemplates,
  setDebriefTemplates,
  appSettings,
  onSaveAppSettings,
}) {
  const role = String(user?.role || '').toLowerCase();
  const isManager = role === 'head_of_sales' || role === 'admin';
  const tabs = useMemo(() => ([
    { key:'account', label:'Compte' },
    { key:'app', label:'Application' },
    { key:'integrations', label:'Intégrations' },
    ...(isManager ? [
      { key:'debrief', label:'Debrief' },
      { key:'templates', label:'Templates' },
      { key:'pipeline', label:'Pipeline' },
    ] : []),
  ]), [isManager]);
  const [activeTab, setActiveTab] = useState(() => resolveSettingsTab(tabs, requestedTab));

  useEffect(() => {
    setActiveTab(prev => resolveSettingsTab(tabs, requestedTab, prev));
  }, [requestedTab, tabs]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <Card style={{ padding:18, background:'var(--glass-bg)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ margin:0, fontSize:24, color:'var(--txt,#4A3428)' }}>Paramètres</h1>
          </div>
          <Btn variant="secondary" onClick={()=>navigate(fromPage || 'Dashboard', returnId || null)}>
            ← Retour
          </Btn>
        </div>
      </Card>

      <Card style={{ padding:10 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={()=>setActiveTab(tab.key)}
              style={{
                border:'none',
                borderRadius:999,
                padding:'8px 12px',
                background:activeTab === tab.key ? 'var(--gradient-primary)' : 'var(--input,#FFF5EB)',
                color:activeTab === tab.key ? 'white' : 'var(--txt2,#B09080)',
                fontSize:12,
                fontWeight:700,
                cursor:'pointer',
                fontFamily:'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {activeTab === 'account' && <AccountSettingsSection user={user} toast={toast} />}
      {activeTab === 'app' && (
        <AppPreferencesSection
          appSettings={appSettings}
          onSaveAppSettings={onSaveAppSettings}
          toast={toast}
        />
      )}

      {activeTab === 'debrief' && isManager && (
        <Card style={{ padding:16 }}>
          <DebriefConfigEditor
            debriefConfig={debriefConfig}
            setDebriefConfig={setDebriefConfig}
            onClose={()=>{}}
            toast={toast}
            embedded
          />
        </Card>
      )}

      {activeTab === 'templates' && isManager && (
        <DebriefTemplatesSection
          debriefTemplates={debriefTemplates}
          setDebriefTemplates={setDebriefTemplates}
          toast={toast}
        />
      )}

      {activeTab === 'pipeline' && isManager && (
        <PipelineSettingsSection toast={toast} />
      )}

      {activeTab === 'integrations' && (
        <IntegrationsSection user={user} toast={toast} />
      )}
    </div>
  );
}


// ─── INTEGRATIONS SECTION ────────────────────────────────────────────────────
function IntegrationsSection({ user, toast }) {
  const [gcalStatus, setGcalStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [events, setEvents] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [importingId, setImportingId] = useState(null);

  const loadStatus = async () => {
    try {
      const data = await apiFetch('/integrations/google/status');
      setGcalStatus(data);
    } catch { setGcalStatus({ connected: false }); }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await apiFetch('/integrations/google/preview');
      setEvents(data.events || []);
    } catch { setEvents([]); }
    finally { setLoadingEvents(false); }
  };

  useEffect(() => {
    loadStatus();
    // Handle redirect back from Google OAuth
    const p = new URLSearchParams(window.location.search);
    if (p.get('gcal_connected') === '1') {
      toast('Google Agenda connecté ! Les leads arrivent.', 'success');
      window.history.replaceState({}, '', window.location.pathname);
      loadStatus();
    }
    if (p.get('gcal_error')) {
      toast('Erreur connexion Google : ' + p.get('gcal_error'), 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (gcalStatus?.connected) loadEvents();
  }, [gcalStatus?.connected]);

  const connectGoogle = () => {
    window.location.href = (import.meta.env.VITE_API_BASE || 'https://closer-backend-production.up.railway.app/api') + '/integrations/google/auth';
  };

  const disconnectGoogle = async () => {
    if (!confirm('Déconnecter Google Agenda ? Les leads futurs ne seront plus créés automatiquement.')) return;
    setDisconnecting(true);
    try {
      await apiFetch('/integrations/google', { method: 'DELETE' });
      toast('Google Agenda déconnecté');
      setGcalStatus({ connected: false });
      setEvents(null);
    } catch (e) { toast(e.message, 'error'); }
    finally { setDisconnecting(false); }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const r = await apiFetch('/integrations/google/sync', { method: 'POST' });
      toast(`Sync terminée — ${r.leadsCreated} lead(s) créé(s)`);
      loadStatus();
      loadEvents();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSyncing(false); }
  };

  const subscribeWatch = async () => {
    setSubscribing(true);
    try {
      await apiFetch('/integrations/google/subscribe', { method: 'POST' });
      toast('Sync temps réel activée !', 'success');
      loadStatus();
    } catch (e) { toast(e.message || 'Erreur activation', 'error'); }
    finally { setSubscribing(false); }
  };

  const importEvent = async (ev) => {
    setImportingId(ev.id);
    try {
      await apiFetch('/integrations/google/import', {
        method: 'POST',
        body: { eventId: ev.id, title: ev.title, start: ev.start, attendees: ev.attendees },
      });
      toast(`Lead créé : ${ev.title}`, 'success');
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, alreadySynced: true } : e));
    } catch (e) { toast(e.message || 'Erreur import', 'error'); }
    finally { setImportingId(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Google Calendar card ─────────────────────────────────────────── */}
      <div style={{ ...G({ padding: 20 }) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          {/* Google logo */}
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1px solid rgba(200,160,140,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>Google Agenda</div>
          </div>
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {gcalStatus === null ? (
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Chargement…</span>
            ) : gcalStatus.connected ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'var(--positive-bg)', color: 'var(--positive-txt)', border: '1px solid rgba(5,150,105,.2)' }}>
                ✓ Connecté
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'var(--neutral-bg)', color: 'var(--neutral-txt)' }}>
                Non connecté
              </span>
            )}
          </div>
        </div>

        {gcalStatus?.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Info */}
            <div style={{ background: 'var(--positive-bg)', border: '1px solid rgba(5,150,105,.15)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--positive-txt)' }}>
              Google Agenda connecté — les RDV avec des participants sont importés automatiquement.
              {gcalStatus.lastSynced && (
                <span style={{ display: 'block', marginTop: 4, color: 'var(--txt3)', fontWeight: 400 }}>
                  Dernière sync : {new Date(gcalStatus.lastSynced).toLocaleString('fr-FR')}
                </span>
              )}
            </div>
            {/* Watch API status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)' }}>
                  {gcalStatus.watchActive ? '⚡ Sync temps réel active' : '🔄 Mode polling uniquement'}
                </div>
                {gcalStatus.watchActive && gcalStatus.channelExpiresAt && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                    Channel expire le {new Date(gcalStatus.channelExpiresAt).toLocaleDateString('fr-FR')}
                  </div>
                )}
                {!gcalStatus.watchActive && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                    Activez la sync temps réel pour recevoir les nouveaux RDV instantanément.
                  </div>
                )}
              </div>
              {!gcalStatus.watchActive && (
                <Btn onClick={subscribeWatch} disabled={subscribing} style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
                  {subscribing ? '…' : 'Activer'}
                </Btn>
              )}
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={syncNow} disabled={syncing} style={{ flex: 1 }}>
                {syncing ? 'Sync en cours…' : '↻ Synchroniser maintenant'}
              </Btn>
              <Btn variant="danger" onClick={disconnectGoogle} disabled={disconnecting}>
                {disconnecting ? '…' : 'Déconnecter'}
              </Btn>
            </div>
            {/* Events preview */}
            <div>
              <p style={{ margin: '4px 0 8px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--txt3)', fontWeight: 700 }}>
                Prochains événements (30 jours)
              </p>
              {loadingEvents ? (
                <Spinner size={20} />
              ) : events && events.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--txt3)', margin: 0 }}>Aucun événement à venir dans les 30 prochains jours.</p>
              ) : events ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {events.map(ev => {
                    const dateStr = ev.start ? new Date(ev.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: ev.start.includes('T') ? '2-digit' : undefined, minute: ev.start.includes('T') ? '2-digit' : undefined }) : '';
                    const importing = importingId === ev.id;
                    return (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                            {dateStr}
                            {ev.attendees?.length > 0 && <span style={{ marginLeft: 8 }}>{ev.attendees.map(a => a.name || a.email).join(', ')}</span>}
                          </div>
                        </div>
                        {ev.alreadySynced ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--positive-txt)', background: 'var(--positive-bg)', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>Importé</span>
                        ) : (
                          <Btn onClick={() => importEvent(ev)} disabled={importing} style={{ padding: '4px 10px', fontSize: 12, flexShrink: 0 }}>
                            {importing ? '…' : 'Importer'}
                          </Btn>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Btn onClick={connectGoogle} style={{ alignSelf: 'flex-start' }}>
              Connecter Google Agenda
            </Btn>
          </div>
        )}
      </div>

      {/* ── Calendly card ────────────────────────────────────────────────── */}
      <div style={{ ...G({ padding: 20 }) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1px solid rgba(200,160,140,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
            🗓️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>Calendly</div>
          </div>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'rgba(217,119,6,.08)', color: '#D97706', border: '1px solid rgba(217,119,6,.2)' }}>
            Config requise
          </span>
        </div>
        <div style={{ background: 'rgba(217,119,6,.06)', border: '1px solid rgba(217,119,6,.15)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--txt2)', lineHeight: 1.7 }}>
          <strong>2 étapes pour activer :</strong>
          <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>Dans votre compte Calendly → <em>Intégrations → Webhooks</em> → URL : <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 4 }}>https://closer-backend-production.up.railway.app/api/webhooks/calendly</code></li>
            <li>Copiez la <em>Signing Key</em> Calendly → ajoutez-la dans Railway comme variable <code style={{ background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 4 }}>CALENDLY_SIGNING_KEY</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export { SettingsPage };
