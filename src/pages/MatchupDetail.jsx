import React from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabaseClient'
import { useLiveData } from '../hooks/useLiveData'
import { labelForType } from '../constants'
import TeamName from '../components/TeamName.jsx'
import Footer from '../components/Footer.jsx'

export default function MatchupDetail({ matchupId, onBack }) {
  const { data, loading } = useLiveData(
    async () => (await supabase.rpc('get_public_matchup_detail', { p_matchup_id: matchupId })).data,
    ['sub_matches'],
    [matchupId]
  )

  return (
    <div className="phone-detail-overlay">
      <button className="phone-detail-back" onClick={onBack}>Back</button>

      {loading || !data ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontWeight: 700, marginTop: 40 }}>Loading...</div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>
              <TeamName name={data.matchup.team_a_name} /> vs <TeamName name={data.matchup.team_b_name} />
            </h2>
            <div style={{ color: 'rgba(255,255,255,.5)', fontWeight: 700, fontSize: '.85rem', marginTop: 4 }}>
              {data.matchup.court}{data.matchup.scheduled_date ? ` - ${data.matchup.scheduled_date}` : ''}
            </div>
          </div>

          <div className="phone-section">
            {data.sub_matches.map(sm => (
              <div key={sm.id} className="phone-sub-match-row">
                <div>
                  <div className="type">{labelForType(sm.match_type)} #{sm.slot_number}</div>
                  <div className="names">
                    <TeamName name={data.matchup.team_a_name} text={sm.team_a_players?.join(' / ') || data.matchup.team_a_name}
                      isWinner={sm.done && sm.winner_team_id === data.matchup.team_a_id} />
                    {' vs '}
                    <TeamName name={data.matchup.team_b_name} text={sm.team_b_players?.join(' / ') || data.matchup.team_b_name}
                      isWinner={sm.done && sm.winner_team_id === data.matchup.team_b_id} />
                  </div>
                </div>
                <div className="score">
                  {sm.done ? `${sm.team_a_score}-${sm.team_b_score}` : '-'}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <Footer variant="phone" />
    </div>
  )
}
