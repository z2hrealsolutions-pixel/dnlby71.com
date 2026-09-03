import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { labelForType } from '../constants'
import TeamName from './TeamName.jsx'

// Team vs Team is shown exactly once, in the header - every match row
// below shows who actually played (player names, styled in their team's
// colors), matching the phone view's pattern exactly rather than
// repeating literal team names throughout.
export default function FullCourtPanel({ courtName, data }) {
  if (!data || !data.matchup) {
    return (
      <div className="court-panel">
        <div className="empty-note">No completed matches yet on {courtName}</div>
      </div>
    )
  }

  const { matchup, sub_matches, most_recent_sub_match_id } = data
  const recent = sub_matches.find(sm => sm.id === most_recent_sub_match_id) || sub_matches.find(sm => sm.done)
  const others = sub_matches.filter(sm => sm.id !== recent?.id)

  return (
    <div className="full-court-panel">
      <div className="stage-tag">{courtName}</div>
      <div className="faceoff-title">
        <TeamName name={matchup.team_a_name} /> <span className="vs-small">vs</span> <TeamName name={matchup.team_b_name} />
      </div>

      {recent && (
        <AnimatePresence mode="wait">
          <motion.div
            key={recent.id + recent.team_a_score + recent.team_b_score}
            className="recent-match-card"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="recent-match-type">{labelForType(recent.match_type)} #{recent.slot_number} - Most Recent</div>
            <div className="recent-team-row">
              <TeamName name={matchup.team_a_name} text={recent.team_a_players?.join(' / ') || matchup.team_a_name}
                isWinner={recent.winner_team_id === matchup.team_a_id} className="recent-team-name" />
              <div className={`recent-score ${recent.winner_team_id === matchup.team_a_id ? 'winner' : ''}`}>{recent.team_a_score}</div>
            </div>
            <div className="recent-team-row">
              <TeamName name={matchup.team_b_name} text={recent.team_b_players?.join(' / ') || matchup.team_b_name}
                isWinner={recent.winner_team_id === matchup.team_b_id} className="recent-team-name" />
              <div className={`recent-score ${recent.winner_team_id === matchup.team_b_id ? 'winner' : ''}`}>{recent.team_b_score}</div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      <div className="compact-match-list">
        {others.map(sm => (
          <div key={sm.id} className="compact-match-row">
            <div className="compact-top-line">
              <span className="compact-type">{labelForType(sm.match_type)} #{sm.slot_number}</span>
              <span className="compact-score">{sm.done ? `${sm.team_a_score} - ${sm.team_b_score}` : 'vs'}</span>
            </div>
            <div className="compact-teams">
              <TeamName name={matchup.team_a_name} text={sm.team_a_players?.join(' / ') || matchup.team_a_name}
                isWinner={sm.done && sm.winner_team_id === matchup.team_a_id} className="compact-team-abbr" />
              <span className="compact-vs">vs</span>
              <TeamName name={matchup.team_b_name} text={sm.team_b_players?.join(' / ') || matchup.team_b_name}
                isWinner={sm.done && sm.winner_team_id === matchup.team_b_id} className="compact-team-abbr" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
