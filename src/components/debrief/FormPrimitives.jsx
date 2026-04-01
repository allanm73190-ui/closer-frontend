import React from 'react';
import { P, P2, TXT, TXT3, R_MD, SH_SM, cardSm } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { Input } from '../ui';

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom:18 }}>
      {label && <p style={{ fontSize:14, fontWeight:700, color:'var(--txt,#5a4a3a)', marginBottom:9 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:11, border:`1px solid ${value===opt.value?'#e87d6a':'var(--border)'}`, background:value===opt.value?'rgba(255,244,239,.92)':'var(--card,#fff)', cursor:'pointer', fontSize:13, color:value===opt.value?'#7d2c1e':'#64748b', transition:'all .15s', boxShadow:value===opt.value?'0 8px 18px rgba(232,125,106,.12)':'none' }}>
            <input type="radio" style={{ marginTop:3, accentColor:'#e87d6a', flexShrink:0 }} checked={value===opt.value} onChange={()=>onChange(opt.value)}/>
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function CheckboxGroup({ label, options, value=[], onChange }) {
  const toggle = v => value.includes(v) ? onChange(value.filter(x=>x!==v)) : onChange([...value, v]);
  return (
    <div style={{ marginBottom:18 }}>
      {label && <p style={{ fontSize:14, fontWeight:700, color:'var(--txt,#5a4a3a)', marginBottom:9 }}>{label}</p>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:11, border:`1px solid ${value.includes(opt.value)?'#e87d6a':'var(--border)'}`, background:value.includes(opt.value)?'rgba(255,244,239,.92)':'var(--card,#fff)', cursor:'pointer', fontSize:13, color:value.includes(opt.value)?'#7d2c1e':'#64748b', transition:'all .15s', boxShadow:value.includes(opt.value)?'0 8px 18px rgba(232,125,106,.12)':'none' }}>
            <input type="checkbox" style={{ marginTop:3, accentColor:'#e87d6a', flexShrink:0 }} checked={value.includes(opt.value)} onChange={()=>toggle(opt.value)}/>
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
function SectionNotes({ notes={}, onChange }) {
  const mob = useIsMobile(640);
  return (
    <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:10, paddingTop:16, marginTop:8, borderTop:'1px solid rgba(232,125,106,.08)' }}>
      {[
        { key:'strength',    label:'👍 Point fort',   placeholder:'Ce qui a bien fonctionné...', color:'#059669' },
        { key:'weakness',    label:'👎 Point faible', placeholder:"Ce qui n'a pas marché...",    color:'#dc2626' },
        { key:'improvement', label:'📈 Amélioration', placeholder:'Comment s\'améliorer...',     color:'#d97706' },
      ].map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color, marginBottom:5 }}>{label}</label>
          <textarea rows={mob?2:3} placeholder={placeholder} value={notes[key]||''} onChange={e=>onChange({...notes,[key]:e.target.value})} style={{ width:'100%', borderRadius:8, border:'1px solid rgba(232,125,106,.12)', padding:'7px 10px', fontSize:12, resize:'none', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        </div>
      ))}
    </div>
  );
}
function CatCard({ number, title, children }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{ ...cardSm({ border:'1px solid rgba(232,125,106,.16)' }), overflow:'hidden', marginBottom:12 }}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{
        display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
        background: open ? `linear-gradient(135deg,${P},${P2})` : `linear-gradient(135deg,rgba(253,232,228,.5),rgba(218,237,245,.32))`,
        width:'100%', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .2s'
      }}>
        <span style={{ width:26, height:26, borderRadius:'50%', background:open?'rgba(255,255,255,.25)':P, color:'white', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{number}</span>
        <span style={{ fontWeight:800, fontSize:14, color:open?'white':TXT, flex:1, textAlign:'left' }}>{title}</span>
        <span style={{ fontSize:13, color:open?'rgba(255,255,255,.8)':TXT3, transition:'transform .2s', display:'inline-block', transform:open?'rotate(180deg)':'none' }}>▾</span>
      </button>
      {open && <div style={{ padding:18, borderTop:`1px solid rgba(232,125,106,.12)` }}>{children}</div>}
    </div>
  );
}
function S1({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="1" title="Phase de découverte">
      <RadioGroup label="Douleur de surface identifiée ?" options={[{value:'oui',label:'Oui'},{value:'non',label:'Non'}]} value={data.douleur_surface} onChange={v=>set('douleur_surface',v)}/>
      {data.douleur_surface==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note ce qu'elle était..." value={data.douleur_surface_note||''} onChange={e=>set('douleur_surface_note',e.target.value)}/></div>}
      <RadioGroup label="Douleur profonde / identitaire atteinte ?" options={[{value:'oui',label:"✅ Oui — verbalisé fort"},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.douleur_profonde} onChange={v=>set('douleur_profonde',v)}/>
      {data.douleur_profonde&&data.douleur_profonde!=='non'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Note la douleur profonde..." value={data.douleur_profonde_note||''} onChange={e=>set('douleur_profonde_note',e.target.value)}/></div>}
      <CheckboxGroup label="Couches de douleur creusées" options={[{value:'couche1',label:'Couche 1 : physique / performance'},{value:'couche2',label:'Couche 2 : impact quotidien / social'},{value:'couche3',label:'Couche 3 : identité / peur du futur'}]} value={data.couches_douleur||[]} onChange={v=>set('couches_douleur',v)}/>
      <RadioGroup label="Temporalité demandée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.temporalite} onChange={v=>set('temporalite',v)}/>
      <RadioGroup label="Urgence naturelle identifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'artificielle',label:'⚠️ Artificielle'},{value:'aucune',label:'❌ Aucune'}]} value={data.urgence} onChange={v=>set('urgence',v)}/>
      {data.urgence==='oui'&&<div style={{marginTop:-8,marginBottom:16}}><Input placeholder="Laquelle ?" value={data.urgence_note||''} onChange={e=>set('urgence_note',e.target.value)}/></div>}
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S2({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="2" title="Reformulation">
      <RadioGroup label="Reformulation faite ?" options={[{value:'oui',label:'✅ Complète et précise'},{value:'partiel',label:'⚠️ Partielle'},{value:'non',label:'❌ Non'}]} value={data.reformulation} onChange={v=>set('reformulation',v)}/>
      <RadioGroup label="Le prospect s'est reconnu ?" options={[{value:'oui',label:"✅ Oui — \"c'est exactement ça\""},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.prospect_reconnu} onChange={v=>set('prospect_reconnu',v)}/>
      <CheckboxGroup label="Les 3 couches présentes ?" options={[{value:'physique',label:'Douleur physique / performance'},{value:'quotidien',label:'Impact quotidien'},{value:'identitaire',label:'Dimension identitaire'}]} value={data.couches_reformulation||[]} onChange={v=>set('couches_reformulation',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S3({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="3" title="Projection">
      <RadioGroup label="Question de projection posée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.projection_posee} onChange={v=>set('projection_posee',v)}/>
      <RadioGroup label="Qualité de la réponse" options={[{value:'forte',label:'✅ Forte — émotionnelle, identitaire'},{value:'moyenne',label:'⚠️ Moyenne'},{value:'faible',label:'❌ Faible'}]} value={data.qualite_reponse} onChange={v=>set('qualite_reponse',v)}/>
      <RadioGroup label="Deadline utilisée comme levier ?" options={[{value:'oui',label:'✅ Oui'},{value:'non_exploitee',label:'⚠️ Non exploitée'},{value:'pas_de_deadline',label:'❌ Pas de deadline'}]} value={data.deadline_levier} onChange={v=>set('deadline_levier',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S4({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="4" title="Présentation de l'offre">
      <RadioGroup label="Présentation collée aux douleurs ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non — générique'}]} value={data.colle_douleurs} onChange={v=>set('colle_douleurs',v)}/>
      <RadioGroup label="Exemples bien choisis ?" options={[{value:'oui',label:"✅ Oui — le prospect s'est reconnu"},{value:'moyen',label:'⚠️ Moyen'},{value:'non',label:'❌ Non'}]} value={data.exemples_transformation} onChange={v=>set('exemples_transformation',v)}/>
      <RadioGroup label="Durée / Offre justifiée ?" options={[{value:'oui',label:'✅ Oui'},{value:'partiel',label:'⚠️ Partiellement'},{value:'non',label:'❌ Non'}]} value={data.duree_justifiee} onChange={v=>set('duree_justifiee',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}
function S5({ data={}, onChange, notes, onNotes }) {
  const set = (k,v) => onChange({...data,[k]:v});
  return (
    <CatCard number="5" title="Closing & Objections">
      <RadioGroup label="Annonce du prix" options={[{value:'directe',label:'✅ Directe et assumée'},{value:'hesitante',label:'⚠️ Hésitante'},{value:'trop_rapide',label:'❌ Trop rapide'}]} value={data.annonce_prix} onChange={v=>set('annonce_prix',v)}/>
      <RadioGroup label="Silence après le prix ?" options={[{value:'oui',label:'✅ Oui — laissé respirer'},{value:'non',label:'❌ Non — rempli trop vite'}]} value={data.silence_prix} onChange={v=>set('silence_prix',v)}/>
      <CheckboxGroup label="Objection rencontrée" options={[{value:'budget',label:'Budget'},{value:'reflechir',label:'"J\'ai besoin de réfléchir"'},{value:'conjoint',label:'Conjoint / autre personne'},{value:'methode',label:'Pas convaincu de la méthode'},{value:'aucune',label:"Pas d'objection"}]} value={data.objections||[]} onChange={v=>set('objections',v)}/>
      <RadioGroup label="Douleur réancrée avant l'objection ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.douleur_reancree} onChange={v=>set('douleur_reancree',v)}/>
      <RadioGroup label="Objection bien isolée ?" options={[{value:'oui',label:'✅ Oui'},{value:'non',label:'❌ Non'}]} value={data.objection_isolee} onChange={v=>set('objection_isolee',v)}/>
      <RadioGroup label="Résultat du closing" options={[{value:'close',label:'✅ Closé en direct'},{value:'retrograde',label:'⚠️ Rétrogradé'},{value:'relance',label:'📅 Relance planifiée'},{value:'porte_ouverte',label:'🔓 Porte ouverte'},{value:'perdu',label:'❌ Perdu'}]} value={data.resultat_closing} onChange={v=>set('resultat_closing',v)}/>
      <SectionNotes notes={notes} onChange={onNotes}/>
    </CatCard>
  );
}


export { RadioGroup, CheckboxGroup, SectionNotes, CatCard, S1, S2, S3, S4, S5 };
