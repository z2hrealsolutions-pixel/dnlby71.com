import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { labelForType, STAGE_LABELS } from '../constants'
import TeamName from '../components/TeamName.jsx'
import MatchupDetail from './MatchupDetail.jsx'
import Logo from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'

function stageLabel(stage) {
  return stage === 'group' ? 'Group Stage' : (STAGE_LABELS[stage] || stage)
}

export default function HistoryPage() {
  const [enabled, setEnabled] = useState(null) // null = checking
  const [faceoffs, setFaceoffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailMatchupId, setDetailMatchupId] = useState(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [playerHistory, setPlayerHistory] = useState(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchWrapRef = useRef(null)

  useEffect(() => { checkEnabledAndLoad() }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function checkEnabledAndLoad() {
    const { data: settings } = await supabase.from('app_settings').select('show_past_faceoffs').single()
    setEnabled(settings?.show_past_faceoffs || false)
    if (settings?.show_past_faceoffs) {
      const { data } = await supabase.rpc('get_public_completed_faceoffs')
      setFaceoffs(data || [])
    }
    setLoading(false)
  }

  async function handleSearchChange(value) {
    setQuery(value)
    setSelectedPlayer(null)
    setPlayerHistory(null)
    if (value.trim().length < 2) { setSuggestions([]); return }
    const { data } = await supabase.rpc('search_players_public', { p_query: value.trim() })
    setSuggestions(data || [])
    setShowSuggestions(true)
  }

  async function pickPlayer(player) {
    setSelectedPlayer(player)
    setQuery(player.name)
    setShowSuggestions(false)
    const { data } = await supabase.rpc('get_player_match_history', { p_player_id: player.id })
    setPlayerHistory(data || [])
  }

  function clearSearch() {
    setQuery(''); setSelectedPlayer(null); setPlayerHistory(null); setSuggestions([])
  }

  if (detailMatchupId) {
    return <MatchupDetail matchupId={detailMatchupId} onBack={() => setDetailMatchupId(null)} />
  }

  return (
    <div className="phone-shell" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="phone-header">
        <Logo height={34} />
        <div className="title">Past Faceoffs</div>
      </div>

      <a href="/" className="phone-detail-back" style={{ display: 'inline-block', marginBottom: 16, textDecoration: 'none' }}>Back to Live</a>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.5)', fontWeight: 700, marginTop: 30 }}>Loading...</div>
      ) : !enabled ? (
        <div className="phone-section" style={{ textAlign: 'center', color: 'rgba(255,255,255,.55)', fontWeight: 700 }}>
          This section isn't available right now.
        </div>
      ) : (
        <>
          <div className="phone-section" ref={searchWrapRef} style={{ position: 'relative' }}>
            <div className="phone-section-title">Search a Player</div>
            <input
              type="text" value={query} placeholder="Type a player's name"
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '2px solid rgba(255,255,255,.15)',
                background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: '.95rem', fontWeight: 700 }}
            />
            {query && (
              <button onClick={clearSearch} style={{ position: 'absolute', right: 26, top: 46, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontWeight: 800, cursor: 'pointer' }}>×</button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{ position: 'absolute', left: 16, right: 16, top: '100%', marginTop: 4, background: '#132D55',
                borderRadius: 10, overflow: 'hidden', zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                {suggestions.map(p => (
                  <div key={p.id} onClick={() => pickPlayer(p)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                    <span style={{ fontWeight: 800 }}>{p.name}</span>
                    <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: '.8rem' }}> - {p.team_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPlayer && playerHistory && (
            <div className="phone-section">
              <div className="phone-section-title">{selectedPlayer.name}'s Matches ({selectedPlayer.team_name})</div>
              {playerHistory.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.5)', fontWeight: 700, fontSize: '.85rem' }}>No completed matches yet for this player.</div>
              ) : playerHistory.map(h => (
                <div key={h.sub_match_id} className="phone-sub-match-row" style={{ cursor: 'pointer' }} onClick={() => setDetailMatchupId(h.matchup_id)}>
                  <div>
                    <div className="type">{labelForType(h.match_type)} #{h.slot_number} - {stageLabel(h.stage)}</div>
                    <div className="names">
                      {h.partner_name ? `w/ ${h.partner_name} ` : ''}vs {h.opponent_players?.join(' / ')} ({h.opponent_team_name})
                    </div>
                  </div>
                  <div className="score" style={{ color: h.won ? 'var(--lime)' : undefined }}>
                    {h.done ? `${h.team_a_score}-${h.team_b_score}` : '-'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!selectedPlayer && (
            <div className="phone-section">
              <div className="phone-section-title">All Completed Faceoffs</div>
              {faceoffs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,.5)', fontWeight: 700, fontSize: '.85rem' }}>No completed face-offs yet.</div>
              ) : faceoffs.map(f => (
                <div key={f.id} className="phone-sub-match-row" style={{ cursor: 'pointer' }} onClick={() => setDetailMatchupId(f.id)}>
                  <div>
                    <div className="type">{stageLabel(f.stage)}</div>
                    <div className="names">
                      <TeamName name={f.team_a_name} isWinner={f.team_a_points > f.team_b_points} /> vs{' '}
                      <TeamName name={f.team_b_name} isWinner={f.team_b_points > f.team_a_points} />
                    </div>
                  </div>
                  <div className="score">{f.team_a_points} - {f.team_b_points}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Footer variant="phone" />
    </div>
  )
}
