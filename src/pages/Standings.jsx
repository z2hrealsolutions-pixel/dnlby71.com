import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { labelForType } from '../constants'

export default function Standings() {
  const [standings, setStandings] = useState([])
  const [matchups, setMatchups] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [standingsRes, matchupsRes] = await Promise.all([
      supabase.from('standings').select('*').order('league_rank'),
      supabase.from('matchups')
        .select('*, team_a:team_a_id(id,name), team_b:team_b_id(id,name)')
        .eq('stage', 'group')
        .order('scheduled_date', { ascending: true, nullsFirst: false }),
    ])
    setStandings(standingsRes.data || [])
    setMatchups(matchupsRes.data || [])
    setLoading(false)
  }

  const selected = matchups.find(m => m.id === selectedId)

  return (
    <div>
      <div className="page-header">
        <h1>Standings &amp; Scores</h1>
        <p>Cumulative points across the round robin. Top 4 advance to the knockout stage</p>
      </div>

      <div className="card">
        <h3>League Table</h3>
        {loading ? <div className="loading-note">Loading…</div> : (
          <table>
            <thead>
              <tr><th>Rank</th><th>Team</th><th>Faceoffs</th><th>DW</th><th>DL</th><th>SW</th><th>SL</th><th>Points</th></tr>
            </thead>
            <tbody>
              {standings.map(s => (
                <tr key={s.team_id}>
                  <td className={s.league_rank <= 4 ? 'rank-1' : ''}>{s.league_rank}</td>
                  <td><b>{s.team_name}</b>{s.league_rank <= 4 && <span className="badge-45">QUALIFYING</span>}</td>
                  <td>{s.matches_played}</td>
                  <td>{s.doubles_won}</td>
                  <td>{s.doubles_lost}</td>
                  <td>{s.singles_won}</td>
                  <td>{s.singles_lost}</td>
                  <td>{s.cumulative_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <label>Select a Face-off to Review or Correct</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">Choose a face-off</option>
          {matchups.map(m => (
            <option key={m.id} value={m.id}>{m.team_a?.name} vs {m.team_b?.name} ({m.status})</option>
          ))}
        </select>
      </div>

      {selected && <MatchupDetail matchup={selected} onChanged={loadAll} />}
    </div>
  )
}

function MatchupDetail({ matchup, onChanged }) {
  const [subMatches, setSubMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [overrideA, setOverrideA] = useState(matchup.team_a_points_override ?? '')
  const [overrideB, setOverrideB] = useState(matchup.team_b_points_override ?? '')
  const [savingOverride, setSavingOverride] = useState(false)

  useEffect(() => { loadSubMatches() }, [matchup.id])

  async function loadSubMatches() {
    setLoading(true)
    const { data } = await supabase
      .from('sub_matches')
      .select('*, lineup_a:lineup_a_id(player1_id, player2_id), lineup_b:lineup_b_id(player1_id, player2_id)')
      .eq('matchup_id', matchup.id)
      .order('match_type').order('slot_number')
    setSubMatches(data || [])
    setLoading(false)
  }

  const calculatedA = subMatches.filter(s => s.done && s.winner_team_id === matchup.team_a_id)
    .reduce((sum, s) => sum + s.points_value, 0)
  const calculatedB = subMatches.filter(s => s.done && s.winner_team_id === matchup.team_b_id)
    .reduce((sum, s) => sum + s.points_value, 0)

  async function saveOverride() {
    setSavingOverride(true)
    const { error } = await supabase.from('matchups').update({
      team_a_points_override: overrideA === '' ? null : Number(overrideA),
      team_b_points_override: overrideB === '' ? null : Number(overrideB),
    }).eq('id', matchup.id)
    setSavingOverride(false)
    if (error) { alert(error.message); return }
    onChanged()
  }

  async function clearOverride() {
    setOverrideA(''); setOverrideB('')
    await supabase.from('matchups').update({ team_a_points_override: null, team_b_points_override: null }).eq('id', matchup.id)
    onChanged()
  }

  async function correctScore(subMatchId, teamAScore, teamBScore) {
    const winnerId = teamAScore > teamBScore ? matchup.team_a_id : (teamBScore > teamAScore ? matchup.team_b_id : null)
    const { error } = await supabase.from('sub_matches').update({
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      winner_team_id: winnerId,
      done: teamAScore !== null && teamBScore !== null,
      last_modified_at: new Date().toISOString(),
    }).eq('id', subMatchId)
    if (error) { alert(error.message); return }
    await supabase.rpc('check_and_complete_matchup', { p_matchup_id: matchup.id })
    loadSubMatches()
    onChanged()
  }

  async function toggleStatus() {
    const newStatus = matchup.status === 'complete' ? 'scheduled' : 'complete'
    if (newStatus === 'complete') {
      const doneCount = subMatches.filter(s => s.done).length
      if (doneCount < subMatches.length) {
        const ok = confirm(`Only ${doneCount} of ${subMatches.length} matches are scored. Mark this face-off complete anyway (e.g. for a forfeit)?`)
        if (!ok) return
      }
    }
    const { error } = await supabase.from('matchups').update({ status: newStatus }).eq('id', matchup.id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  return (
    <div className="card">
      <div className="toolbar">
        <h3 style={{ margin: 0 }}>{matchup.team_a?.name} vs {matchup.team_b?.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`pill ${matchup.status === 'complete' ? 'done' : 'pending'}`}>{matchup.status}</span>
          <button className="btn secondary small" onClick={toggleStatus}>
            {matchup.status === 'complete' ? 'Reopen' : 'Mark Complete'}
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.82rem', marginTop: 0 }}>
        This face-off is normally marked complete automatically the moment its 9th match is scored. Use the
        button above only if it needs correcting manually (e.g. a forfeit that won't ever reach all 9 matches).
      </p>

      {loading ? <div className="loading-note">Loading sub-matches…</div> : (
        <table>
          <thead>
            <tr><th>Match</th><th>Score</th><th>Winner</th><th>Pts</th><th>Correct</th></tr>
          </thead>
          <tbody>
            {subMatches.map(sm => (
              <SubMatchRow key={sm.id} subMatch={sm} matchup={matchup} onSave={correctScore} />
            ))}
            {subMatches.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                No sub-matches yet. Enter lineups for both teams first.
              </td></tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 20, borderTop: '2px solid var(--surface-2)', paddingTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Points Override</h3>
        <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem', marginTop: 0 }}>
          Calculated from sub-matches: <b>{matchup.team_a?.name} {calculatedA}</b> vs <b>{calculatedB} {matchup.team_b?.name}</b>.
          Only set an override for something that isn't a scoring correction (e.g. a forfeit or disciplinary decision).
          for a wrong score, correct the sub-match above instead, so the total stays traceable to what was actually played.
        </p>
        <div className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label>{matchup.team_a?.name} Override</label>
            <input type="number" value={overrideA} onChange={e => setOverrideA(e.target.value)} placeholder="leave blank to use calculated" />
          </div>
          <div className="field">
            <label>{matchup.team_b?.name} Override</label>
            <input type="number" value={overrideB} onChange={e => setOverrideB(e.target.value)} placeholder="leave blank to use calculated" />
          </div>
          <div className="field" style={{ flex: 'none', display: 'flex', gap: 8 }}>
            <button className="btn pink" onClick={saveOverride} disabled={savingOverride}>Save Override</button>
            <button className="btn secondary" onClick={clearOverride}>Clear</button>
          </div>
        </div>
        {(matchup.team_a_points_override !== null || matchup.team_b_points_override !== null) && (
          <span className="pill override">Override currently active for this face-off</span>
        )}
      </div>
    </div>
  )
}

function SubMatchRow({ subMatch, matchup, onSave }) {
  const [a, setA] = useState(subMatch.team_a_score ?? '')
  const [b, setB] = useState(subMatch.team_b_score ?? '')

  const winnerName = subMatch.winner_team_id === matchup.team_a_id ? matchup.team_a?.name
    : subMatch.winner_team_id === matchup.team_b_id ? matchup.team_b?.name : '-'

  return (
    <tr>
      <td>{labelForType(subMatch.match_type)} #{subMatch.slot_number}</td>
      <td>{subMatch.done ? `${subMatch.team_a_score} - ${subMatch.team_b_score}` : <span className="pill pending">not played</span>}</td>
      <td>{winnerName}</td>
      <td>{subMatch.points_value}</td>
      <td>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" value={a} onChange={e => setA(e.target.value)} style={{ width: 55 }} />
          <span>-</span>
          <input type="number" value={b} onChange={e => setB(e.target.value)} style={{ width: 55 }} />
          <button className="btn small secondary" onClick={() => onSave(subMatch.id, Number(a), Number(b))}>Save</button>
        </div>
      </td>
    </tr>
  )
}
