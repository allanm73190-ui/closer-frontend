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
export default function Detail({ debrief, navigate, onDelete, fromPage, user, toast }) {
  const mob = useIsMobile();
  if (!debrief) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <p style={{ color:'#c8b8a8' }}>Debrief introuvable</p>
      <Btn variant="secondary" onClick={()=>navigate('Dashboard')} style={{ marginTop:16 }}>Retour</Btn>
    </div>
  );
  const pct    = Math.round(debrief.percentage || 0);
  const scores = computeSectionScores(debrief.sections || {});
  const barCol = v => v>=4?'#059669':v>=3?'#d97706':v>=2?'#e87d6a':'#ef4444';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Btn variant="secondary" onClick={()=>navigate(fromPage||'Dashboard')} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:16,flexShrink:0}}>←</Btn>
          <div>
            <h1 style={{ fontSize:mob?18:22, fontWeight:700, color:'#5a4a3a', margin:0 }}>{debrief.prospect_name}</h1>
            <div style={{ display:'flex', gap:12, fontSize:12, color:'#c8b8a8', marginTop:4, flexWrap:'wrap' }}>
              <span>📅 {fmtDate(debrief.call_date)}</span>
              <span>👤 {debrief.closer_name}</span>
              {debrief.user_name && <span>par {debrief.user_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <ClosedBadge isClosed={debrief.is_closed}/>
          {debrief.call_link && <a href={debrief.call_link} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px',border:'1px solid rgba(232,125,106,.12)',borderRadius:8,background:'#ffffff',fontSize:12,textDecoration:'none',color:'#5a4a3a'}}>🔗 Écouter</a>}
          <Btn variant="danger" onClick={()=>onDelete(debrief.id)} style={{width:36,height:36,padding:0,borderRadius:8,fontSize:14}}>🗑</Btn>
        </div>
      </div>

      {mob ? (
        <>
          <Card style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#c8b8a8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:20 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:16 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:'#5a4a3a' }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(232,125,106,.12)', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:8, background:'rgba(232,125,106,.1)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:4, transition:'width .7s' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20, alignItems:'start' }}>
          <Card style={{ padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <ScoreGauge percentage={pct}/>
            <p style={{ fontSize:13, color:'#c8b8a8', margin:0 }}>{debrief.total_score} / {debrief.max_score} points</p>
            <Radar scores={scores}/>
          </Card>
          <Card style={{ padding:24 }}>
            <h3 style={{ fontSize:14, fontWeight:600, color:'#5a4a3a', marginBottom:20 }}>Score par section</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {SECTIONS.map(({ key, label }) => {
                const val = scores[key]||0;
                const sn  = debrief.section_notes?.[key];
                return (
                  <div key={key}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#5a4a3a' }}>{label}</span>
                      <span style={{ fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:6, border:'1px solid rgba(232,125,106,.12)', color:barCol(val) }}>{val}/5</span>
                    </div>
                    <div style={{ height:8, background:'rgba(232,125,106,.1)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(val/5)*100}%`, background:barCol(val), borderRadius:4, transition:'width .7s' }}/>
                    </div>
                    {sn && (sn.strength||sn.weakness||sn.improvement) && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:8 }}>
                        {sn.strength    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#166534'}}>👍 {sn.strength}</div>}
                        {sn.weakness    && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'#fff5f5',border:'1px solid #fca5a5',color:'#991b1b'}}>👎 {sn.weakness}</div>}
                        {sn.improvement && <div style={{fontSize:11,padding:'6px 8px',borderRadius:6,background:'rgba(255,251,235,.7)',border:'1px solid #fcd34d',color:'#92400e'}}>📈 {sn.improvement}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {(debrief.strengths||debrief.improvements||debrief.notes) && (
        <div style={{ display:'grid', gridTemplateColumns:mob?'1fr':'repeat(3,1fr)', gap:12 }}>
          {debrief.strengths    && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#059669',marginBottom:8}}>Points forts</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.strengths}</p></Card>}
          {debrief.improvements && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#d97706',marginBottom:8}}>Axes d'amélioration</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.improvements}</p></Card>}
          {debrief.notes        && <Card style={{padding:16}}><h3 style={{fontSize:13,fontWeight:600,color:'#e87d6a',marginBottom:8}}>Notes</h3><p style={{fontSize:13,color:'#6b7280',whiteSpace:'pre-wrap',margin:0}}>{debrief.notes}</p></Card>}
        </div>
      )}

      {/* Comments */}
      <CommentsSection debriefId={debrief.id} user={user} toast={toast}/>
    </div>
  );
}

