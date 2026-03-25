import React, { useState } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, TXT, TXT2, TXT3, SAND, WHITE, SH_SM, R_SM, R_MD, R_LG, R_FULL, card, inp, DEFAULT_DEBRIEF_CONFIG } from '../constants.js';
import { Input, Btn, AlertBox, Modal } from '../components/ui.jsx';

export function AccountSettings({ user, onClose, toast, debriefConfig, setDebriefConfig }) {
  const isHOS = user.role === 'head_of_sales';
  const [tab, setTab] = useState('profil');
  const [pwd, setPwd] = useState({ current:'', next:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const changePwd = async () => {
    setErr('');
    if (pwd.next !== pwd.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (pwd.next.length < 8) return setErr('Trop court (8 caractères min)');
    setSaving(true);
    try { await apiFetch('/auth/change-password',{method:'POST',body:{currentPassword:pwd.current,newPassword:pwd.next}}); toast('Mot de passe modifié !'); setPwd({current:'',next:'',confirm:''}); }
    catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  const tabs = [
    {key:'profil',   label:'👤 Profil'},
    {key:'securite', label:'🔒 Sécurité'},
    ...(isHOS ? [{key:'questions', label:'📋 Questions'}] : []),
  ];

  return (
    <Modal title="Paramètres du compte" onClose={onClose}>
      <div style={{display:'flex',gap:4,background:'rgba(253,232,228,.2)',padding:4,borderRadius:8,marginBottom:20}}>
        {tabs.map(({key,label})=>(
          <button key={key} type="button" onClick={()=>setTab(key)} style={{flex:1,padding:'7px 12px',borderRadius:6,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',background:tab===key?WHITE:'transparent',color:tab===key?TXT:TXT2,boxShadow:tab===key?'0 1px 3px rgba(0,0,0,.08)':'none',fontFamily:'inherit'}}>{label}</button>
        ))}
      </div>
      {tab==='profil' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:14,padding:16,background:'rgba(253,232,228,.2)',borderRadius:12,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${P},${P2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white',flexShrink:0}}>{user.name.charAt(0)}</div>
            <div>
              <p style={{fontWeight:700,fontSize:16,color:TXT,margin:0}}>{user.name}</p>
              <p style={{fontSize:13,color:TXT2,margin:'2px 0 0'}}>{user.email}</p>
              <span style={{display:'inline-block',marginTop:4,background:isHOS?'#fef3c7':'rgba(253,232,228,.6)',color:isHOS?'#92400e':P2,fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4}}>
                {isHOS?'👑 Head of Sales':'🎯 Closer'}
              </span>
            </div>
          </div>
          <p style={{fontSize:13,color:TXT3,textAlign:'center'}}>La modification du profil sera disponible prochainement.</p>
        </div>
      )}
      {tab==='securite' && (
        <div>
          <p style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:16}}>Changer le mot de passe</p>
          <AlertBox type="error" message={err}/>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[{key:'current',label:'Mot de passe actuel'},{key:'next',label:'Nouveau mot de passe'},{key:'confirm',label:'Confirmer'}].map(({key,label})=>(
              <div key={key}><label style={{display:'block',fontSize:12,fontWeight:600,color:TXT,marginBottom:5}}>{label}</label><Input type="password" placeholder="••••••••" value={pwd[key]} onChange={e=>setPwd({...pwd,[key]:e.target.value})}/></div>
            ))}
            <Btn onClick={changePwd} disabled={saving||!pwd.current||!pwd.next||!pwd.confirm} style={{marginTop:4}}>{saving?'Modification...':'Modifier le mot de passe'}</Btn>
          </div>
        </div>
      )}
      {tab==='questions' && isHOS && (
        <DebriefConfigEditor debriefConfig={debriefConfig} setDebriefConfig={setDebriefConfig} onClose={onClose} toast={toast}/>
      )}
    </Modal>
  );
}

function DebriefConfigEditor({ debriefConfig, setDebriefConfig, onClose, toast }) {
  const [config, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(debriefConfig || DEFAULT_DEBRIEF_CONFIG)));
  const [saving, setSaving] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const sec = config[Math.min(activeIdx, config.length-1)];
  const si  = Math.min(activeIdx, config.length-1);

  const updSec = (field, val) => setLocalConfig(p => p.map((s,i) => i===si ? {...s,[field]:val} : s));
  const updQ   = (qi, field, val) => setLocalConfig(p => p.map((s,i) => i!==si ? s : {...s, questions:s.questions.map((q,j) => j===qi ? {...q,[field]:val} : q)}));
  const addQ   = () => setLocalConfig(p => p.map((s,i) => i!==si ? s : {...s, questions:[...s.questions, {id:`q_${Date.now()}`,label:'Nouvelle question',type:'radio',options:[{value:'oui',label:'Oui'},{value:'non',label:'Non'}]}]}));
  const delQ   = qi => setLocalConfig(p => p.map((s,i) => i!==si ? s : {...s, questions:s.questions.filter((_,j)=>j!==qi)}));
  const addSec = () => { setLocalConfig(p => [...p, {key:`sec_${Date.now()}`,title:'Nouvelle section',questions:[]}]); setActiveIdx(config.length); };
  const delSec = () => { if(config.length<=1) return; setLocalConfig(p=>p.filter((_,i)=>i!==si)); setActiveIdx(Math.max(0,si-1)); };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/debrief-config', {method:'PUT', body:{sections:config}});
      setDebriefConfig(config);
      toast('Questions sauvegardées !');
      onClose();
    } catch(e) { toast(e.message,'error'); } finally { setSaving(false); }
  };

  const reset = async () => {
    if (!confirm('Réinitialiser aux questions par défaut ?')) return;
    try {
      await apiFetch('/debrief-config', {method:'DELETE'});
      setLocalConfig(DEFAULT_DEBRIEF_CONFIG);
      setDebriefConfig(DEFAULT_DEBRIEF_CONFIG);
      toast('Questions réinitialisées');
    } catch(e) { toast(e.message,'error'); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        {config.map((s,i) => (
          <button type="button" key={s.key} onClick={()=>setActiveIdx(i)}
            style={{padding:'5px 12px',borderRadius:R_FULL,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',background:i===activeIdx?`linear-gradient(135deg,${P},${P2})`:'rgba(253,232,228,.3)',color:i===activeIdx?'white':TXT2}}>
            {i+1}. {s.title}
          </button>
        ))}
        <button type="button" onClick={addSec} style={{padding:'5px 12px',borderRadius:R_FULL,border:`1px dashed rgba(232,125,106,.4)`,fontSize:12,cursor:'pointer',fontFamily:'inherit',background:'transparent',color:TXT3}}>+ Section</button>
      </div>
      {sec && (
        <div style={{...card(),padding:14}}>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <Input value={sec.title} onChange={e=>updSec('title',e.target.value)} style={{fontSize:13,fontWeight:700}}/>
            {config.length>1 && <button type="button" onClick={delSec} style={{padding:'8px 10px',borderRadius:R_SM,border:'none',background:'rgba(253,232,228,.6)',color:'#c05040',cursor:'pointer',flexShrink:0}}>🗑</button>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {sec.questions.map((q,qi) => (
              <div key={q.id} style={{background:SAND,borderRadius:R_SM,padding:'10px 12px',border:'1px solid rgba(232,125,106,.1)'}}>
                <div style={{display:'flex',gap:6,marginBottom:6}}>
                  <Input value={q.label} onChange={e=>updQ(qi,'label',e.target.value)} style={{fontSize:12}}/>
                  <select value={q.type} onChange={e=>updQ(qi,'type',e.target.value)} style={{...inp(),width:'auto',padding:'8px 10px',fontSize:12,flexShrink:0}}>
                    <option value="radio">Choix unique</option>
                    <option value="checkbox">Choix multiple</option>
                    <option value="text">Texte libre</option>
                  </select>
                  <button type="button" onClick={()=>delQ(qi)} style={{padding:'8px 10px',borderRadius:R_SM,border:'none',background:'rgba(253,232,228,.6)',color:'#c05040',cursor:'pointer',flexShrink:0}}>🗑</button>
                </div>
                {q.type !== 'text' && (
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {(q.options||[]).map((opt,oi) => (
                      <div key={oi} style={{display:'flex',gap:4}}>
                        <Input value={opt.value} onChange={e=>updQ(qi,'options',q.options.map((o,k)=>k===oi?{...o,value:e.target.value}:o))} style={{fontSize:11,flex:'0 0 80px'}}/>
                        <Input value={opt.label} onChange={e=>updQ(qi,'options',q.options.map((o,k)=>k===oi?{...o,label:e.target.value}:o))} style={{fontSize:11}}/>
                        <button type="button" onClick={()=>updQ(qi,'options',q.options.filter((_,k)=>k!==oi))} style={{background:'none',border:'none',color:TXT3,cursor:'pointer',fontSize:13,padding:'0 4px'}}>✕</button>
                      </div>
                    ))}
                    <button type="button" onClick={()=>updQ(qi,'options',[...(q.options||[]),{value:`opt${Date.now()}`,label:'Nouvelle option'}])}
                      style={{alignSelf:'flex-start',padding:'3px 10px',borderRadius:R_SM,border:`1px dashed rgba(232,125,106,.3)`,background:'transparent',fontSize:11,color:TXT3,cursor:'pointer',fontFamily:'inherit'}}>+ Option</button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addQ} style={{padding:'7px 12px',borderRadius:R_SM,border:`1px dashed rgba(232,125,106,.3)`,background:'transparent',fontSize:12,color:TXT3,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>+ Question</button>
          </div>
        </div>
      )}
      <div style={{display:'flex',gap:8,justifyContent:'space-between',flexWrap:'wrap'}}>
        <button type="button" onClick={reset} style={{padding:'8px 14px',borderRadius:R_FULL,border:`1px solid rgba(192,80,64,.3)`,background:'rgba(253,232,228,.5)',color:'#c05040',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Réinitialiser</button>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving?'Sauvegarde...':'Sauvegarder'}</Btn>
        </div>
      </div>
    </div>
  );
}
