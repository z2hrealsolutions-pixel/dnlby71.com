import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { labelForType } from '../constants'
import TeamName from './TeamName.jsx'

// Shows the most recently completed sub-match on a given court. Realtime
// pushes a new value here the instant a referee saves a score, and the
// key-based AnimatePresence below makes that transition pop visually
// rather than just silently swapping numbers.
export default function CourtPanel({ courtName, status, onClick }) {
  return (
    <div className="court-panel" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <AnimatePresence mode="wait">
        {!status ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="empty-note">No completed matches yet on {courtName}</div>
          </motion.div>
        ) : (
          <motion.div
            key={status.sub_match_id + status.team_a_score + status.team_b_score}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
          >
            <div className="stage-tag">{courtName}</div>
            <div className="match-type">{labelForType(status.match_type)} #{status.slot_number}</div>

            <div className="team-block">
              <TeamName name={status.team_a_name} isWinner={status.team_a_score > status.team_b_score} className="team-name" />
              <div className="players">{status.team_a_players?.join(' / ') || ''}</div>
              <motion.div
                className={`score ${status.team_a_score > status.team_b_score ? 'winner' : ''}`}
                initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.35 }}
              >
                {status.team_a_score}
              </motion.div>
            </div>

            <div className="vs-line">VS</div>

            <div className="team-block">
              <TeamName name={status.team_b_name} isWinner={status.team_b_score > status.team_a_score} className="team-name" />
              <div className="players">{status.team_b_players?.join(' / ') || ''}</div>
              <motion.div
                className={`score ${status.team_b_score > status.team_a_score ? 'winner' : ''}`}
                initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ duration: 0.35 }}
              >
                {status.team_b_score}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
