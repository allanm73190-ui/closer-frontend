export const PASSWORD_POLICY = {
  minLength: 10,
  requiredFamilies: 3,
};

export function getPasswordFamilies(password) {
  const value = String(password || '');
  return {
    lower: /[a-z]/.test(value),
    upper: /[A-Z]/.test(value),
    digit: /[0-9]/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
}

export function getPasswordStrength(password) {
  const value = String(password || '');
  const families = getPasswordFamilies(value);
  const score = Object.values(families).filter(Boolean).length;
  if (!value) {
    return { label:'Vide', color:'#9ca3af', score:0, families };
  }
  if (value.length < PASSWORD_POLICY.minLength || score <= 1) {
    return { label:'Faible', color:'#dc2626', score, families };
  }
  if (score === 2) {
    return { label:'Moyen', color:'#d97706', score, families };
  }
  if (score === 3) {
    return { label:'Solide', color:'#059669', score, families };
  }
  return { label:'Très solide', color:'#047857', score, families };
}

export function validatePasswordPolicy(password, context = {}) {
  const pwd = String(password || '');
  if (pwd.length < PASSWORD_POLICY.minLength) {
    return {
      ok: false,
      message: `Le mot de passe doit contenir au moins ${PASSWORD_POLICY.minLength} caractères.`,
      code: 'PASSWORD_TOO_SHORT',
    };
  }

  const families = getPasswordFamilies(pwd);
  const score = Object.values(families).filter(Boolean).length;
  if (score < PASSWORD_POLICY.requiredFamilies) {
    return {
      ok: false,
      message: 'Le mot de passe doit combiner au moins 3 éléments: majuscule, minuscule, chiffre, symbole.',
      code: 'PASSWORD_WEAK_PATTERN',
    };
  }

  const lowerPwd = pwd.toLowerCase();
  const blockedPatterns = ['password', 'motdepasse', '123456', 'qwerty', 'azerty', 'closerdebrief'];
  if (blockedPatterns.some(pattern => lowerPwd.includes(pattern))) {
    return {
      ok: false,
      message: 'Le mot de passe contient un motif trop prévisible.',
      code: 'PASSWORD_PREDICTABLE',
    };
  }

  const email = String(context.email || '').trim().toLowerCase();
  if (email) {
    const parts = email.split('@')[0]?.split(/[._-]/).filter(Boolean) || [];
    if (parts.some(part => part.length >= 3 && lowerPwd.includes(part))) {
      return {
        ok: false,
        message: "Le mot de passe ne doit pas contenir une partie de l'email.",
        code: 'PASSWORD_CONTAINS_EMAIL',
      };
    }
  }

  const name = String(context.name || '').trim().toLowerCase();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.some(part => part.length >= 3 && lowerPwd.includes(part))) {
      return {
        ok: false,
        message: "Le mot de passe ne doit pas contenir votre prénom ou nom.",
        code: 'PASSWORD_CONTAINS_NAME',
      };
    }
  }

  return { ok: true, code: 'PASSWORD_OK' };
}
