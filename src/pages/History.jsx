import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../api.js';
import { P, P2, A, TXT, TXT2, TXT3, SAND, WHITE, SH_CARD, SH_SM, SH_BTN, SH_IN, SH_HOVERED, R_SM, R_MD, R_LG, R_XL, R_FULL, card, cardSm, inp, BTN, DS, DEFAULT_DEBRIEF_CONFIG, PIPELINE_STAGES, SECTIONS } from '../constants.js';
import { fmtDate, fmtShort, computeScore, computeSectionScores, computeLevel, avgSectionScores } from '../utils.js';
import { useIsMobile, useToast, useDebriefConfig } from '../hooks.js';
import { Input, Textarea, Btn, AlertBox, Spinner, Card, Modal, Empty } from '../components/ui.jsx';
import { ScoreGauge, ScoreBadge, ClosedBadge, Radar, SectionBars, GamCard, Leaderboard, StatsRow, Chart, RadioGroup, CheckboxGroup, SectionNotes, CatCard, DebriefCard } from '../components/shared.jsx';
import { MiniPipeline, DealCard, DropColumn, AccordionColumn } from '../components/pipeline.jsx';
import { UserMenu } from '../components/layout.jsx';
import { MemberRow, TeamCard, ProgBar, ObjectiveBanner, ObjectiveModal, ActionPlanCard, CommentsSection } from '../components/hos.jsx';
export default function History({ debriefs, navigate, user }) {
  const [q, setQ] = useState('');
  const isHOS = user.role==='head_of_sales';
  const filtered = debriefs.filter(d => {
    const s = q.toLowerCase();
    return d.prospect_name?.toLowerCase().includes(s) || d.closer_name?.toLowerCase().includes(s) || d.user_name?.toLowerCase().includes(s);
  });
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>Historique</h1>
        <p style={{ color:'#c8b8a8', fontSize:13, marginTop:4 }}>{debriefs.length} debrief{debriefs.length!==1?'s':''}</p>
      </div>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#c8b8a8', pointerEvents:'none' }}>🔍</span>
        <input placeholder="Rechercher..." value={q} onChange={e=>setQ(e.target.value)} style={{ width:'100%', padding:'12px 36px', border:'1px solid rgba(232,125,106,.12)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
        {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#c8b8a8', cursor:'pointer', fontSize:18 }}>✕</button>}
      </div>
      {filtered.length===0
        ? <Empty icon="🔍" title="Aucun résultat" subtitle={q?`Aucun debrief pour "${q}"`:'Aucun debrief'} action={q?<Btn variant="secondary" onClick={()=>setQ('')}>Effacer</Btn>:null}/>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>{filtered.map(d=><DebriefCard key={d.id} debrief={d} onClick={()=>navigate('Detail',d.id,'History')} showUser={isHOS}/>)}</div>
      }
    </div>
  );
}

