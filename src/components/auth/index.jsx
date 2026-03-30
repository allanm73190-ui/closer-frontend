import React, { useState } from 'react';
import { apiFetch, setToken } from '../../config/api';
import { DS, P, P2, SH_BTN, card } from '../../styles/designSystem';
import { Input, Btn, AlertBox } from '../ui';

function AuthShell({ subtitle, icon, children }) {
  return (
    <div style={{ minHeight:'100vh', background:"linear-gradient(160deg,#f5ede6,#e8f0f5)", display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:460 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${P},${P2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 14px', boxShadow:SH_BTN }}>
            {icon}
          </div>
          <h1 style={{ fontSize:24, fontWeight:700, color:'var(--txt,#5a4a3a)', margin:0 }}>CloserDebrief</h1>
          <p style={{ color:'var(--txt2,#b09080)', fontSize:14, marginTop:6 }}>{subtitle}</p>
        </div>
        <div style={{ ...card(), padding:28 }}>{children}</div>
      </div>
    </div>
  );
}
function LoginPage({ onLogin, goRegister, goForgot }) {
  const [f, setF] = useState({ email:'', password:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { const d = await apiFetch('/auth/login',{method:'POST',body:f}); setToken(d.token); onLogin(d.user,d.gamification); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="📞" subtitle="Connectez-vous à votre compte">
      <AlertBox type="error" message={err}/>
      <form onSubmit={submit}>
        <div style={{marginBottom:16}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required autoFocus/></div>
        <div style={{marginBottom:8}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Mot de passe</label><Input type="password" placeholder="••••••••" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required/></div>
        <div style={{textAlign:'right',marginBottom:24}}><button type="button" onClick={goForgot} style={{background:'none',border:'none',color:'#e87d6a',fontSize:13,cursor:'pointer'}}>Mot de passe oublié ?</button></div>
        <Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Connexion...':'Se connecter'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:20}}>Pas encore de compte ?{' '}<button onClick={goRegister} style={{background:'none',border:'none',color:'#e87d6a',fontWeight:600,cursor:'pointer',fontSize:14}}>S'inscrire</button></p>
    </AuthShell>
  );
}

function RegisterPage({ onLogin, goLogin }) {
  const [f, setF] = useState({ name:'', email:'', password:'', confirm:'', role:'closer', invite_code:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (f.password.length < 8) return setErr('Mot de passe trop court (8 car. min)');
    if (f.role==='closer'&&!f.invite_code) return setErr("Un code d'invitation est requis");
    setLoading(true);
    try { const d = await apiFetch('/auth/register',{method:'POST',body:{name:f.name,email:f.email,password:f.password,role:f.role,invite_code:f.invite_code}}); setToken(d.token); onLogin(d.user,d.gamification); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="📞" subtitle="Créez votre compte">
      <AlertBox type="error" message={err}/>
      <div style={{marginBottom:20}}>
        <label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:8}}>Je suis...</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[{value:'closer',label:'🎯 Closer',desc:'Je fais des appels'},{value:'head_of_sales',label:'👑 Head of Sales',desc:'Je gère une équipe'}].map(({value,label,desc})=>(
            <button key={value} type="button" onClick={()=>setF({...f,role:value})} style={{padding:'12px 14px',borderRadius:10,border:`2px solid ${f.role===value?'#e87d6a':'#e2e8f0'}`,background:f.role===value?'rgba(255,248,245,.8)':'white',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
              <p style={{fontWeight:600,fontSize:13,color:f.role===value?'#4c1d95':'#374151',margin:0}}>{label}</p>
              <p style={{fontSize:11,color:DS.textMuted,margin:'2px 0 0'}}>{desc}</p>
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={submit}>
        {[{key:'name',label:'Nom complet',ph:'Jean Dupont',type:'text'},{key:'email',label:'Email',ph:'votre@email.com',type:'email'},{key:'password',label:'Mot de passe',ph:'8 caractères minimum',type:'password'},{key:'confirm',label:'Confirmer',ph:'••••••••',type:'password'}].map(({key,label,ph,type})=>(
          <div key={key} style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>{label}</label><Input type={type} placeholder={ph} value={f[key]} onChange={e=>setF({...f,[key]:e.target.value})} required/></div>
        ))}
        {f.role==='closer'&&(
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>🔑 Code d'invitation</label>
            <Input placeholder="Ex: ABC12345" value={f.invite_code} onChange={e=>setF({...f,invite_code:e.target.value.toUpperCase()})} required/>
            <p style={{fontSize:12,color:DS.textMuted,marginTop:4}}>Demandez ce code à votre Head of Sales</p>
          </div>
        )}
        <Btn type="submit" disabled={loading} style={{width:'100%',marginTop:8}}>{loading?'Création...':'Créer mon compte'}</Btn>
      </form>
      <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:20}}>Déjà un compte ?{' '}<button onClick={goLogin} style={{background:'none',border:'none',color:'#e87d6a',fontWeight:600,cursor:'pointer',fontSize:14}}>Se connecter</button></p>
    </AuthShell>
  );
}

function ForgotPage({ goLogin }) {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');
  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await apiFetch('/auth/forgot-password',{method:'POST',body:{email}}); setSent(true); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="🔐" subtitle="Réinitialisation du mot de passe">
      {sent
        ? <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:16}}>📬</div><h2 style={{fontSize:18,fontWeight:600,color:'#5a4a3a',marginBottom:8}}>Email envoyé !</h2><p style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Si cet email est enregistré, vous recevrez un lien.</p><Btn variant="secondary" onClick={goLogin} style={{width:'100%'}}>Retour à la connexion</Btn></div>
        : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Email</label><Input type="email" placeholder="votre@email.com" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Envoi...':'Envoyer le lien'}</Btn></form><p style={{textAlign:'center',fontSize:13,marginTop:16}}><button onClick={goLogin} style={{background:'none',border:'none',color:'#e87d6a',cursor:'pointer',fontSize:13}}>← Retour</button></p></>
      }
    </AuthShell>
  );
}

function ResetPage({ token, onDone }) {
  const [f, setF] = useState({ password:'', confirm:'' });
  const [err, setErr] = useState('');
  const [ok, setOk]   = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    if (f.password.length < 8) return setErr('Trop court');
    setLoading(true);
    try { await apiFetch('/auth/reset-password',{method:'POST',body:{token,password:f.password}}); setOk(true); setTimeout(onDone, 2000); }
    catch(e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <AuthShell icon="🔑" subtitle="Nouveau mot de passe">
      {ok ? <AlertBox type="success" message="Mot de passe modifié ! Redirection..."/>
          : <><AlertBox type="error" message={err}/><form onSubmit={submit}><div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Nouveau mot de passe</label><Input type="password" placeholder="8 caractères minimum" value={f.password} onChange={e=>setF({...f,password:e.target.value})} required autoFocus/></div><div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#5a4a3a',marginBottom:6}}>Confirmer</label><Input type="password" placeholder="••••••••" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})} required/></div><Btn type="submit" disabled={loading} style={{width:'100%'}}>{loading?'Modification...':'Modifier le mot de passe'}</Btn></form></>}
    </AuthShell>
  );
}

export { AuthShell, LoginPage, RegisterPage, ForgotPage, ResetPage };
