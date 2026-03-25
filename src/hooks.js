import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './api.js';
import { DEFAULT_DEBRIEF_CONFIG } from './constants.js';

// ─── useIsMobile ──────────────────────────────────────────────────────────────
export function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setV(window.innerWidth < bp);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [bp]);
  return v;
}

// ─── useToast ─────────────────────────────────────────────────────────────────
export function useToast() {
  const [list, setList] = useState([]);
  const toast = useCallback((msg, type='success') => {
    const id = Date.now();
    setList(p => [...p, { id, msg, type }]);
    setTimeout(() => setList(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { list, toast };
}

// ─── useDebriefConfig ─────────────────────────────────────────────────────────
export function useDebriefConfig() {
  const [config, setConfig] = useState(DEFAULT_DEBRIEF_CONFIG);
  useEffect(() => {
    apiFetch('/debrief-config')
      .then(d => { if (d && Array.isArray(d.sections) && d.sections.length > 0) setConfig(d.sections); })
      .catch(() => {});
  }, []);
  return [config, setConfig];
}
