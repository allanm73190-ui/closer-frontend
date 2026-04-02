import React, { useState } from 'react';
import { apiFetch, setToken } from '../../config/api';
import { DS, P, P2 } from '../../styles/designSystem';
import { useIsMobile } from '../../hooks';
import { PASSWORD_POLICY, getPasswordStrength, validatePasswordPolicy } from '../../utils/security';
import { AlertBox } from '../ui';

const fieldWrap = { display:'flex', flexDirection:'column', gap:6 };
const fieldLabel = {
  fontSize:11,
  fontWeight:700,
  letterSpacing:'.12em',
  textTransform:'uppercase',
  color:'var(--txt2,#b09080)',
};
const fieldInput = {
  width:'100%',
  border:'1px solid var(--border)',
  background:'var(--input-on-card)',
  borderRadius:14,
  padding:'12px 14px',
  fontSize:14,
  color:'var(--txt,#5a4a3a)',
  fontFamily:'inherit',
  outline:'none',
  boxShadow:'inset 0 1px 0 rgba(255,255,255,.75)',
};
const primaryBtn = {
  width:'100%',
  border:'1px solid rgba(255,255,255,.24)',
  background:`linear-gradient(135deg,${P},${P2})`,
  color:'white',
  borderRadius:999,
  padding:'12px 16px',
  fontSize:14,
  fontWeight:700,
  cursor:'pointer',
  boxShadow:'0 14px 30px rgba(212,96,78,.34)',
  fontFamily:'inherit',
};
const linkBtn = {
  border:'none',
  background:'none',
  color:P,
  cursor:'pointer',
  fontSize:13,
  fontWeight:700,
  fontFamily:'inherit',
  padding:0,
};

function AuthShell({ title, subtitle, children, wide=false }) {
  const mob = useIsMobile();
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:mob?14:26, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:-120, right:-110, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,125,106,.26), rgba(232,125,106,0) 72%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-120, left:-120, width:330, height:330, borderRadius:'50%', background:'radial-gradient(circle, rgba(106,172,206,.24), rgba(106,172,206,0) 72%)', pointerEvents:'none' }} />

      <div
        style={{
          position:'relative',
          width:'100%',
          maxWidth:wide ? 1040 : 940,
          display:'grid',
          gridTemplateColumns:mob ? '1fr' : '1fr 1.08fr',
          background:'var(--card-soft)',
          border:'1px solid var(--border)',
          borderRadius:28,
          overflow:'hidden',
          boxShadow:'var(--sh-card)',
          backdropFilter:'blur(18px)',
        }}
      >
        {!mob && (
          <aside style={{ position:'relative', background:`linear-gradient(160deg, ${P}, ${P2})`, padding:'44px 38px', color:'white', display:'flex', flexDirection:'column', justifyContent:'space-between', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, opacity:.12, background:'radial-gradient(circle at 16% 22%, rgba(255,255,255,.85), transparent 48%)' }} />
            <div style={{ position:'relative' }}>
              <h1 style={{ margin:0, fontSize:34, fontWeight:800, lineHeight:1 }}>CloserDebrief</h1>
              <p style={{ margin:'8px 0 0', fontSize:10, letterSpacing:'.2em', textTransform:'uppercase', opacity:.86, fontWeight:700 }}>Sales Intelligence</p>
            </div>
            <div style={{ position:'relative' }}>
              <h2 style={{ margin:0, fontSize:40, fontWeight:800, lineHeight:1.05 }}>Transformez chaque appel en progrès mesurable.</h2>
              <p style={{ margin:'16px 0 0', fontSize:15, lineHeight:1.6, opacity:.9 }}>
                Analyse, coaching IA et exécution commerciale dans une seule interface pensée pour closer mieux.
              </p>
            </div>
          </aside>
        )}

        <section style={{ padding:mob ? '24px 20px' : '40px 46px', background:'var(--card)' }}>
          {mob && (
            <div style={{ marginBottom:20 }}>
              <h1 style={{ margin:0, fontSize:30, fontWeight:800, color:P, lineHeight:1 }}>CloserDebrief</h1>
              <p style={{ margin:'6px 0 0', fontSize:10, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--txt2,#b09080)', fontWeight:700 }}>Sales Intelligence</p>
            </div>
          )}

          <div style={{ marginBottom:22 }}>
            <h2 style={{ margin:0, fontSize:mob ? 26 : 30, fontWeight:800, color:'var(--txt,#5a4a3a)', lineHeight:1.08 }}>{title}</h2>
            <p style={{ margin:'8px 0 0', fontSize:14, color:'var(--txt2,#b09080)', maxWidth:420, lineHeight:1.5 }}>{subtitle}</p>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}

function TextField({
  label,
  type='text',
  value,
  onChange,
  placeholder='',
  required=false,
  autoFocus=false,
}) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        style={fieldInput}
      />
    </label>
  );
}

function LoginPage({ onLogin, goRegister, goForgot }) {
  const [f, setF] = useState({ email:'', password:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const d = await apiFetch('/auth/login', { method:'POST', body:f });
      setToken(d.token);
      onLogin(d.user, d.gamification);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre tableau de bord de vente et reprenez votre dynamique de closing.">
      <AlertBox type="error" message={err}/>
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <TextField
          label="Email"
          type="email"
          value={f.email}
          onChange={e => setF({ ...f, email:e.target.value })}
          placeholder="votre@email.com"
          required
          autoFocus
        />
        <TextField
          label="Mot de passe"
          type="password"
          value={f.password}
          onChange={e => setF({ ...f, password:e.target.value })}
          placeholder="••••••••"
          required
        />

        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button type="button" onClick={goForgot} style={linkBtn}>Mot de passe oublié ?</button>
        </div>

        <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity:loading ? .7 : 1, cursor:loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p style={{ margin:'18px 0 0', textAlign:'center', fontSize:13, color:DS.textMuted }}>
        Pas encore de compte ?{' '}
        <button type="button" onClick={goRegister} style={linkBtn}>S'inscrire</button>
      </p>
    </AuthShell>
  );
}

function RegisterPage({ onLogin, goLogin }) {
  const [f, setF] = useState({ name:'', email:'', password:'', confirm:'', role:'closer', invite_code:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const mob = useIsMobile();

  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    const pwdPolicy = validatePasswordPolicy(f.password, { email:f.email, name:f.name });
    if (!pwdPolicy.ok) return setErr(pwdPolicy.message);
    if (f.role === 'closer' && !f.invite_code) return setErr("Un code d'invitation est requis");
    setLoading(true);
    try {
      const d = await apiFetch('/auth/register', {
        method:'POST',
        body:{
          name:f.name,
          email:f.email,
          password:f.password,
          role:f.role,
          invite_code:f.invite_code,
        },
      });
      setToken(d.token);
      onLogin(d.user, d.gamification);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  const strength = getPasswordStrength(f.password);

  return (
    <AuthShell wide title="Créer un compte" subtitle="Choisissez votre rôle pour activer la bonne expérience (Closer ou Head of Sales).">
      <AlertBox type="error" message={err}/>

      <div style={{ marginBottom:16 }}>
        <p style={{ ...fieldLabel, margin:'0 0 8px' }}>Rôle</p>
        <div style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : '1fr 1fr', gap:10 }}>
          {[
            { value:'closer', icon:'📞', label:'Closer', desc:'Je passe les appels de vente' },
            { value:'head_of_sales', icon:'👥', label:'Head of Sales', desc:"Je pilote l'équipe commerciale" },
          ].map(item => {
            const active = f.role === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={()=>setF({ ...f, role:item.value })}
                style={{
                  border:`1.5px solid ${active ? P : 'rgba(195,147,121,.34)'}`,
                  background:active ? 'rgba(253,232,228,.75)' : 'rgba(255,255,255,.86)',
                  borderRadius:14,
                  padding:'10px 12px',
                  textAlign:'left',
                  cursor:'pointer',
                  fontFamily:'inherit',
                  display:'flex',
                  gap:10,
                  alignItems:'flex-start',
                }}
              >
                <span style={{ fontSize:17 }}>
                  {item.icon}
                </span>
                <span>
                  <span style={{ display:'block', fontSize:13, fontWeight:700, color:'var(--txt,#5a4a3a)' }}>{item.label}</span>
                  <span style={{ display:'block', fontSize:11, marginTop:3, color:DS.textMuted }}>{item.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={submit} style={{ display:'grid', gridTemplateColumns:mob ? '1fr' : '1fr 1fr', gap:12 }}>
        <div style={mob ? undefined : { gridColumn:'1 / -1' }}>
          <TextField
            label="Nom complet"
            value={f.name}
            onChange={e => setF({ ...f, name:e.target.value })}
            placeholder="Jean Dupont"
            required
          />
        </div>

        <div style={mob ? undefined : { gridColumn:'1 / -1' }}>
          <TextField
            label="Email"
            type="email"
            value={f.email}
            onChange={e => setF({ ...f, email:e.target.value })}
            placeholder="votre@email.com"
            required
          />
        </div>

        <TextField
          label="Mot de passe"
          type="password"
          value={f.password}
          onChange={e => setF({ ...f, password:e.target.value })}
          placeholder={`${PASSWORD_POLICY.minLength} caractères minimum`}
          required
        />
        <TextField
          label="Confirmer"
          type="password"
          value={f.confirm}
          onChange={e => setF({ ...f, confirm:e.target.value })}
          placeholder="••••••••"
          required
        />
        <div style={{ gridColumn:'1 / -1', marginTop:-4 }}>
          <p style={{ margin:0, fontSize:11, color:strength.color, fontWeight:700 }}>
            Sécurité du mot de passe: {strength.label}
          </p>
          <p style={{ margin:'2px 0 0', fontSize:11, color:DS.textMuted }}>
            Requis: {PASSWORD_POLICY.minLength}+ caractères, 3 éléments parmi majuscule, minuscule, chiffre, symbole.
          </p>
        </div>

        {f.role === 'closer' && (
          <div style={{ gridColumn:'1 / -1' }}>
            <TextField
              label="Code d'invitation"
              value={f.invite_code}
              onChange={e => setF({ ...f, invite_code:e.target.value.toUpperCase() })}
              placeholder="ABC-123-XYZ"
              required
            />
          </div>
        )}

        <div style={{ gridColumn:'1 / -1', marginTop:2 }}>
          <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity:loading ? .7 : 1, cursor:loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Création...' : "Créer mon compte"}
          </button>
        </div>
      </form>

      <p style={{ margin:'18px 0 0', textAlign:'center', fontSize:13, color:DS.textMuted }}>
        Déjà un compte ?{' '}
        <button type="button" onClick={goLogin} style={linkBtn}>Se connecter</button>
      </p>
    </AuthShell>
  );
}

function ForgotPage({ goLogin }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await apiFetch('/auth/forgot-password', { method:'POST', body:{ email } });
      setSent(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Entrez votre email pour recevoir le lien de réinitialisation.">
      {sent ? (
        <div style={{ textAlign:'center', padding:'8px 0 2px' }}>
          <span style={{ fontSize:50, display:'inline-block', marginBottom:8 }}>📬</span>
          <h3 style={{ margin:'0 0 8px', fontSize:22, fontWeight:800, color:'var(--txt,#5a4a3a)' }}>Email envoyé</h3>
          <p style={{ margin:'0 0 16px', fontSize:14, color:DS.textMuted }}>
            Si cet email existe, vous recevrez un lien de réinitialisation.
          </p>
          <button type="button" onClick={goLogin} style={{ ...primaryBtn, maxWidth:280 }}>Retour à la connexion</button>
        </div>
      ) : (
        <>
          <AlertBox type="error" message={err}/>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              autoFocus
            />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity:loading ? .7 : 1, cursor:loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
          <div style={{ marginTop:16, textAlign:'center' }}>
            <button type="button" onClick={goLogin} style={linkBtn}>Retour</button>
          </div>
        </>
      )}
    </AuthShell>
  );
}

function ResetPage({ token, onDone }) {
  const [f, setF] = useState({ password:'', confirm:'' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (f.password !== f.confirm) return setErr('Les mots de passe ne correspondent pas');
    const pwdPolicy = validatePasswordPolicy(f.password);
    if (!pwdPolicy.ok) return setErr(pwdPolicy.message);
    setLoading(true);
    try {
      await apiFetch('/auth/reset-password', { method:'POST', body:{ token, password:f.password } });
      setOk(true);
      setTimeout(onDone, 1800);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  const strength = getPasswordStrength(f.password);

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Définissez un mot de passe sécurisé pour reprendre l’accès.">
      {ok ? (
        <AlertBox type="success" message="Mot de passe modifié. Redirection en cours..." />
      ) : (
        <>
          <AlertBox type="error" message={err}/>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <TextField
              label="Nouveau mot de passe"
              type="password"
              value={f.password}
              onChange={e => setF({ ...f, password:e.target.value })}
              placeholder={`${PASSWORD_POLICY.minLength} caractères minimum`}
              required
              autoFocus
            />
            <TextField
              label="Confirmer"
              type="password"
              value={f.confirm}
              onChange={e => setF({ ...f, confirm:e.target.value })}
              placeholder="••••••••"
              required
            />
            <p style={{ margin:'-2px 0 0', fontSize:11, color:strength.color, fontWeight:700 }}>
              Sécurité du mot de passe: {strength.label}
            </p>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity:loading ? .7 : 1, cursor:loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}

export { AuthShell, LoginPage, RegisterPage, ForgotPage, ResetPage };
