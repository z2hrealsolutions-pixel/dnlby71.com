import React from 'react'
import { labelForType } from '../constants'
import TeamName from './TeamName.jsx'

// Team vs Team is shown exactly once, in the header - every one of the 9
// match rows below gets identical visual treatment, no match singled out
// as "most recent." Each row shows who actually played (player names,
// styled in their team's colors), matching the phone view's pattern.
export default function FullCourtPanel({ courtName, data }) {
  if (!data || !data.matchup) {
    return (
      <div className="court-panel">
        <div className="empty-note">No completed matches yet on {courtName}</div>
      </div>
    )
  }

  const { matchup, sub_matches } = data

  return (
    <div className="full-court-panel">
      <div className="stage-tag">{courtName}</div>
      <div className="faceoff-title">
        <TeamName name={matchup.team_a_name} /> <span className="vs-small">vs</span> <TeamName name={matchup.team_b_name} />
      </div>

      <div className="compact-match-list">
        {sub_matches.map(sm => (
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
