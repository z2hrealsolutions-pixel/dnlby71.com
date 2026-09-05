import React from 'react'
import { motion } from 'framer-motion'
import { STAGE_LABELS } from '../constants'
import TeamName from './TeamName.jsx'

// Layout is defined as percentages of the container's width/height, so the
// SVG connector lines and the HTML match boxes always stay aligned no
// matter how large or small this renders (TV column vs full phone screen).
const BOX_POS = {
  qualifier1: { left: 2, top: 6, width: 32, height: 22 },
  eliminator: { left: 2, top: 72, width: 32, height: 22 },
  qualifier2: { left: 38, top: 39, width: 32, height: 22 },
  final: { left: 74, top: 39, width: 24, height: 22 },
}

function rightEdge(stage, yPct) {
  const b = BOX_POS[stage]
  return { x: b.left + b.width, y: b.top + b.height * yPct }
}
function leftEdge(stage, yPct) {
  const b = BOX_POS[stage]
  return { x: b.left, y: b.top + b.height * yPct }
}

// Four connectors, drawn as simple right-angle "step" paths - the
// standard, clean style for tournament bracket diagrams.
function stepPath(from, to, midX) {
  return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`
}

const CONNECTORS = [
  stepPath(rightEdge('qualifier1', 0.3), leftEdge('final', 0.3), 72.5),
  stepPath(rightEdge('qualifier1', 0.75), leftEdge('qualifier2', 0.3), 36),
  stepPath(rightEdge('eliminator', 0.3), leftEdge('qualifier2', 0.75), 36),
  stepPath(rightEdge('qualifier2', 0.5), leftEdge('final', 0.75), 71),
]

export default function Bracket({ matchups, teams }) {
  const byStage = Object.fromEntries((matchups || []).map(m => [m.stage, m]))

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 260 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {CONNECTORS.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="rgba(1,246,216,.55)"
            strokeWidth={0.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </svg>

      {Object.entries(BOX_POS).map(([stage, pos], i) => (
        <motion.div
          key={stage}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="bracket-box"
          style={{ position: 'absolute', left: `${pos.left}%`, top: `${pos.top}%`, width: `${pos.width}%` }}
        >
          <BracketBoxContent stage={stage} matchup={byStage[stage]} />
        </motion.div>
      ))}
    </div>
  )
}

function BracketBoxContent({ stage, matchup }) {
  return (
    <>
      <div className="stage-label">{STAGE_LABELS[stage]}</div>
      {matchup ? (
        <>
          <TeamLine name={matchup.team_a_name} points={matchup.team_a_points} isWinner={matchup.winner_team_id === matchup.team_a_id} />
          <TeamLine name={matchup.team_b_name} points={matchup.team_b_points} isWinner={matchup.winner_team_id === matchup.team_b_id} />
        </>
      ) : (
        <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '.8rem', fontWeight: 700, padding: '6px 0' }}>TBD</div>
      )}
    </>
  )
}

function TeamLine({ name, points, isWinner }) {
  return (
    <div className={`team-line ${isWinner ? 'winner' : ''}`}>
      <TeamName name={name} isWinner={isWinner} />
      <span className="pts">{points ?? '-'}</span>
    </div>
  )
}
