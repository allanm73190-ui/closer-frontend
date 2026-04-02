import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import { DS } from '../../styles/designSystem';
import { Btn, Input, Modal, AlertBox, Card } from '../ui';

const DEFAULT_DEBRIEF_CONFIG = [
  { key:'decouverte', title:'Phase de découverte', questions:[
    { id:'douleur_surface',   label:'Douleur de surface identifiée ?',          type:'radio',    options:[{value:'oui',label:'Oui'},{value:'non',label:'Non'}] },
    { id:'douleur_profonde',  label:'Douleur profonde / identitaire atteinte ?', type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
    { id:'couches_douleur',   label:'Couches de douleur creusées',               type:'checkbox', options:[{value:'couche1',label:'Couche 1 : physique'},{value:'couche2',label:'Couche 2 : quotidien'},{value:'couche3',label:'Couche 3 : identité'}] },
    { id:'temporalite',       label:'Temporalité demandée ?',                    type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'urgence',           label:'Urgence naturelle identifiée ?',            type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}] },
  ]},
  { key:'reformulation', title:'Reformulation', questions:[
    { id:'reformulation',         label:'Reformulation faite ?',       type:'radio',    options:[{value:'oui',label:'✅ Complète'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}] },
    { id:'prospect_reconnu',      label:"Le prospect s'est reconnu ?", type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
    { id:'couches_reformulation', label:'Les 3 couches présentes ?',   type:'checkbox', options:[{value:'physique',label:'Physique'},{value:'quotidien',label:'Quotidien'},{value:'identitaire',label:'Identitaire'}] },
  ]},
  { key:'projection', title:'Projection', questions:[
    { id:'projection_posee', label:'Question de projection posée ?',   type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'qualite_reponse',  label:'Qualité de la réponse',            type:'radio', options:[{value:'forte',label:'✅ Forte'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}] },
    { id:'deadline_levier',  label:'Deadline utilisée comme levier ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}] },
  ]},
  { key:'presentation_offre', title:"Présentation de l'offre", questions:[
    { id:'colle_douleurs',          label:'Présentation collée aux douleurs ?', type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
    { id:'exemples_transformation', label:'Exemples bien choisis ?',            type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}] },
    { id:'duree_justifiee',         label:'Durée / Offre justifiée ?',          type:'radio', options:[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}] },
  ]},
  { key:'closing', title:'Closing & Objections', questions:[
    { id:'annonce_prix',     label:'Annonce du prix',                      type:'radio',    options:[{value:'directe',label:'✅ Directe'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}] },
    { id:'silence_prix',     label:'Silence après le prix ?',              type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'objections',       label:'Objection rencontrée',                 type:'checkbox', options:[{value:'budget',label:'Budget'},{value:'reflechir',label:'Besoin de réfléchir'},{value:'conjoint',label:'Conjoint'},{value:'methode',label:'Méthode'},{value:'aucune',label:'Aucune'}] },
    { id:'douleur_reancree', label:"Douleur réancrée avant l'objection ?", type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'objection_isolee', label:'Objection bien isolée ?',              type:'radio',    options:[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}] },
    { id:'resultat_closing', label:'Résultat du closing',                  type:'radio',    options:[{value:'close',label:'✅ Closé'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}] },
  ]},
];

function CloserTeamSettings({ toast }) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/teams/me');
      setTeam(data.team || null);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const joinTeam = async () => {
    const inviteCode = code.trim().toUpperCase();
    if (!inviteCode) return;
    setJoining(true);
    try {
      const data = await apiFetch('/teams/join-with-code', {
        method: 'POST',
        body: { invite_code: inviteCode },
      });
      setCode('');
      setTeam(data.team || null);
      toast(`Vous avez rejoint l'équipe "${data.team?.name || ''}"`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {loading ? (
        <p style={{ fontSize:13, color:DS.textMuted, margin:0 }}>Chargement de votre équipe...</p>
      ) : (
        <Card style={{ padding:14 }}>
          <p style={{ margin:'0 0 6px', fontSize:12, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em', fontWeight:700 }}>Équipe actuelle</p>
          <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#5a4a3a' }}>
            {team ? `👥 ${team.name}` : 'Aucune équipe'}
          </p>
        </Card>
      )}

      <div>
        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#5a4a3a', marginBottom:6 }}>
          Rejoindre une équipe avec un code
        </label>
        <div style={{ display:'flex', gap:8 }}>
          <Input
            placeholder="Ex: ABC12345"
            value={code}
            onChange={e=>setCode(e.target.value.toUpperCase())}
            onKeyDown={e=>{ if (e.key === 'Enter') joinTeam(); }}
          />
          <Btn onClick={joinTeam} disabled={joining || !code.trim()}>
            {joining ? 'Connexion...' : 'Rejoindre'}
          </Btn>
        </div>
        <p style={{ fontSize:12, color:DS.textMuted, margin:'6px 0 0' }}>
          Utilisez le code donné par votre Head of Sales.
        </p>
      </div>
    </div>
  );
}

function AccountSettings({ user, onClose, toast }) {
  const isManager = user.role === 'head_of_sales' || user.role === 'admin';
  const isCloser = user.role === 'closer';
  const [tab, setTab] = useState('profil');
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const changePwd = async () => {
    setErr('');
    if (pwd.next !== pwd.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (pwd.next.length < 8) return setErr('Trop court (8 caractères min)');
    setSaving(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: pwd.current, newPassword: pwd.next },
      });
      toast('Mot de passe modifié !');
      setPwd({ current:'', next:'', confirm:'' });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key:'profil', label:'👤 Profil' },
    ...(isCloser ? [{ key:'equipe', label:'👥 Équipe' }] : []),
    { key:'securite', label:'🔒 Sécurité' },
  ];

  return (
    <Modal title="Paramètres du compte" onClose={onClose}>
      <div style={{ display:'flex', gap:4, background:'rgba(253,232,228,.2)', padding:4, borderRadius:8, marginBottom:20 }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={()=>setTab(key)}
            style={{
              flex:1, padding:'7px 12px', borderRadius:6, border:'none', fontSize:13, fontWeight:500, cursor:'pointer',
              background:tab===key ? DS.bgCard : 'transparent',
              color:tab===key ? DS.textPrimary : DS.textSecondary,
              boxShadow:tab===key ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
              fontFamily:'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab==='profil' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:16, background:'rgba(253,232,228,.2)', borderRadius:12, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:DS.bgNavItem, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'white', flexShrink:0 }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:16, color:DS.textPrimary, margin:0 }}>{user.name}</p>
              <p style={{ fontSize:13, color:DS.textSecondary, margin:'2px 0 0' }}>{user.email}</p>
              <span style={{ display:'inline-block', marginTop:4, background:isManager?'#fef3c7':'rgba(253,232,228,.6)', color:isManager?'#92400e':DS.primary2, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4 }}>
                {user.role === 'admin' ? '🛡️ Admin' : isManager ? '👑 Head of Sales' : '🎯 Closer'}
              </span>
            </div>
          </div>
          <p style={{ fontSize:13, color:DS.textMuted, textAlign:'center' }}>Modification du profil bientôt disponible.</p>
        </div>
      )}

      {tab==='equipe' && isCloser && <CloserTeamSettings toast={toast} />}

      {tab==='securite' && (
        <div>
          <p style={{ fontSize:13, fontWeight:600, color:DS.textPrimary, marginBottom:16 }}>Changer le mot de passe</p>
          <AlertBox type="error" message={err} />
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[{key:'current',label:'Mot de passe actuel'},{key:'next',label:'Nouveau mot de passe'},{key:'confirm',label:'Confirmer'}].map(({key,label})=>(
              <div key={key}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:DS.textPrimary, marginBottom:5 }}>{label}</label>
                <Input type="password" placeholder="••••••••" value={pwd[key]} onChange={e=>setPwd({ ...pwd, [key]: e.target.value })} />
              </div>
            ))}
            <Btn onClick={changePwd} disabled={saving || !pwd.current || !pwd.next || !pwd.confirm} style={{ marginTop:4 }}>
              {saving ? 'Modification...' : 'Modifier le mot de passe'}
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DebriefConfigEditor({ debriefConfig, setDebriefConfig, onClose, toast, embedded = false }) {
  const [config, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(debriefConfig || DEFAULT_DEBRIEF_CONFIG)));
  const [saving, setSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setLocalConfig(JSON.parse(JSON.stringify(debriefConfig || DEFAULT_DEBRIEF_CONFIG)));
  }, [debriefConfig]);

  const si = Math.min(activeIdx, Math.max(config.length - 1, 0));
  const sec = config[si];

  const updSecTitle = (val) => {
    setLocalConfig(prev => prev.map((section, idx) => idx === si ? { ...section, title: val } : section));
  };

  const updQuestionLabel = (qi, val) => {
    setLocalConfig(prev => prev.map((section, idx) => {
      if (idx !== si) return section;
      return {
        ...section,
        questions: (section.questions || []).map((q, qIdx) => qIdx === qi ? { ...q, label: val } : q),
      };
    }));
  };

  const updOptionLabel = (qi, oi, val) => {
    setLocalConfig(prev => prev.map((section, idx) => {
      if (idx !== si) return section;
      return {
        ...section,
        questions: (section.questions || []).map((q, qIdx) => {
          if (qIdx !== qi) return q;
          return {
            ...q,
            options: (q.options || []).map((opt, oIdx) => oIdx === oi ? { ...opt, label: val } : opt),
          };
        }),
      };
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/debrief-config', { method:'PUT', body:{ sections: config } });
      setDebriefConfig(config);
      toast('Questions sauvegardées !');
      if (!embedded) onClose?.();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setLocalConfig(JSON.parse(JSON.stringify(debriefConfig || DEFAULT_DEBRIEF_CONFIG)));
    if (!embedded) onClose?.();
  };

  const reset = async () => {
    if (!confirm('Réinitialiser aux questions par défaut ?')) return;
    try {
      await apiFetch('/debrief-config', { method:'DELETE' });
      setLocalConfig(DEFAULT_DEBRIEF_CONFIG);
      setDebriefConfig(DEFAULT_DEBRIEF_CONFIG);
      toast('Questions réinitialisées');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <p style={{ margin:0, fontSize:12, color:DS.textMuted }}>
        Modification synchronisée sur tous les debriefs. Les IDs et la logique de score restent conservés.
      </p>

      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {config.map((s, i) => (
          <button
            type="button"
            key={s.key}
            onClick={()=>setActiveIdx(i)}
            style={{
              padding:'5px 12px',
              borderRadius:DS.radiusFull,
              border:'none',
              fontSize:12,
              fontWeight:600,
              cursor:'pointer',
              fontFamily:'inherit',
              background:i===activeIdx ? `linear-gradient(135deg,${DS.primary},${DS.primary2})` : 'rgba(253,232,228,.3)',
              color:i===activeIdx ? 'white' : DS.textSecondary,
            }}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {sec && (
        <div style={{ background:DS.bgCard, borderRadius:DS.radiusMd, boxShadow:DS.shadowSm, padding:14 }}>
          <div style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:11, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:5 }}>
              Titre de section
            </label>
            <Input value={sec.title} onChange={e=>updSecTitle(e.target.value)} style={{ fontSize:13, fontWeight:700 }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {(sec.questions || []).map((q, qi) => (
              <div key={q.id} style={{ background:DS.bgInput, borderRadius:DS.radiusSm, padding:'10px 12px', border:'1px solid rgba(232,125,106,.1)' }}>
                <label style={{ display:'block', fontSize:11, color:DS.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:6 }}>
                  Question
                </label>
                <Input value={q.label} onChange={e=>updQuestionLabel(qi, e.target.value)} style={{ fontSize:12, marginBottom:8 }} />
                <p style={{ margin:'0 0 8px', fontSize:11, color:DS.textMuted }}>
                  Type: <strong>{q.type === 'checkbox' ? 'Choix multiple' : q.type === 'text' ? 'Texte' : 'Choix unique'}</strong>
                </p>

                {q.type !== 'text' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {(q.options || []).map((opt, oi) => (
                      <div key={opt.value || oi}>
                        <label style={{ display:'block', fontSize:10, color:DS.textMuted, marginBottom:3 }}>
                          Option ({opt.value})
                        </label>
                        <Input
                          value={opt.label}
                          onChange={e=>updOptionLabel(qi, oi, e.target.value)}
                          style={{ fontSize:11 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'space-between', flexWrap:'wrap' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding:'8px 14px',
            borderRadius:DS.radiusFull,
            border:'1px solid rgba(192,80,64,.3)',
            background:'rgba(253,232,228,.5)',
            color:'#c05040',
            fontSize:12,
            cursor:'pointer',
            fontFamily:'inherit',
          }}
        >
          Réinitialiser
        </button>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="secondary" onClick={cancel}>
            {embedded ? 'Annuler les modifications' : 'Annuler'}
          </Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Btn>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_DEBRIEF_CONFIG, AccountSettings, DebriefConfigEditor };
