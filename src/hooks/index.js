import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';

// ─── RESPONSIVE ───────────────────────────────────────────────────────────────
export function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return v;
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth;
    return w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop';
  });
  useEffect(() => {
    const h = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? 'mobile' : w < 1200 ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return bp;
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
export function useToast() {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type = 'success', ms = 3500) => {
    const id = Date.now() + Math.random();
    setList(p => [...p, { id, msg, type }]);
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), ms);
  }, []);
  return { list, toast };
}

// ─── DEBRIEF CONFIG ──────────────────────────────────────────────────────────
export function useDebriefConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    if (!localStorage.getItem('cd_token')) return; // Don't fetch if not logged in
    apiFetch('/debrief-config')
      .then(data => { if (data.sections) setConfig(data.sections); })
      .catch(() => {});
  }, []);
  return [config, setConfig];
}
