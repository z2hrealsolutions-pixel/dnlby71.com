import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { labelForType, STAGE_LABELS } from '../constants'

export default function Knockout() {
  const [standings, setStandings] = useState([])
  const [groupMatchups, setGroupMatchups] = useState([])
  const [knockoutMatchups, setKnockoutMatchups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBracket, setShowBracket] = useState(false)
  const [togglingBracket, setTogglingBracket] = useState(false)
  const [knockoutCourt, setKnockoutCourt] = useState('')
  const [savingCourt, setSavingCourt] = useState(false)
  const [championBanner, setChampionBanner] = useState(false)
  const [togglingBanner, setTogglingBanner] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [standingsRes, groupRes, koRes, settingsRes] = await Promise.all([
      supabase.from('standings').select('*').order('league_rank'),
      supabase.from('matchups').select('id, status').eq('stage', 'group'),
      supabase.from('matchups')
        .select('*, team_a:team_a_id(id,name), team_b:team_b_id(id,name)')
        .in('stage', ['qualifier1', 'eliminator', 'qualifier2', 'final']),
      supabase.from('app_settings').select('show_knockout_bracket, knockout_court, show_champion_banner').single(),
    ])
    setStandings(standingsRes.data || [])
    setGroupMatchups(groupRes.data || [])
    setKnockoutMatchups(koRes.data || [])
    setShowBracket(settingsRes.data?.show_knockout_bracket || false)
    setKnockoutCourt(settingsRes.data?.knockout_court || '')
    setChampionBanner(settingsRes.data?.show_champion_banner || false)
    setLoading(false)
  }

  async function toggleBracket() {
    setTogglingBracket(true)
    const newValue = !showBracket
    const { error } = await supabase.from('app_settings').update({ show_knockout_bracket: newValue }).eq('id', true)
    setTogglingBracket(false)
    if (error) { alert(error.message); return }
    setShowBracket(newValue)
  }

  async function saveKnockoutCourt(court) {
    setSavingCourt(true)
    const { error } = await supabase.from('app_settings').update({ knockout_court: court || null }).eq('id', true)
    setSavingCourt(false)
    if (error) { alert(error.message); return }
    setKnockoutCourt(court)
  }

  async function toggleChampionBanner() {
    const newValue = !championBanner
    if (newValue) {
      const ok = confirm('This shows the gold champion banner on the public TV and phone views immediately, for anyone currently watching. Continue?')
      if (!ok) return
    }
    setTogglingBanner(true)
    const { error } = await supabase.from('app_settings').update({ show_champion_banner: newValue }).eq('id', true)
    setTogglingBanner(false)
    if (error) { alert(error.message); return }
    setChampionBanner(newValue)
  }

  const groupComplete = groupMatchups.length > 0 && groupMatchups.every(m => m.status === 'complete')
  const q1 = knockoutMatchups.find(m => m.stage === 'qualifier1')
  const elim = knockoutMatchups.find(m => m.stage === 'eliminator')
  const q2 = knockoutMatchups.find(m => m.stage === 'qualifier2')
  const final = knockoutMatchups.find(m => m.stage === 'final')

  async function getWinnerLoser(matchup) {
    if (matchup.winner_team_id_override) {
      const winnerId = matchup.winner_team_id_override
      const loserId = winnerId === matchup.team_a_id ? matchup.team_b_id : matchup.team_a_id
      return { winnerId, loserId }
    }
    const { data: subs } = await supabase.from('sub_matches').select('*').eq('matchup_id', matchup.id)
    const calcA = matchup.team_a_points_override ?? subs.filter(s => s.done && s.winner_team_id === matchup.team_a_id).reduce((s, x) => s + x.points_value, 0)
    const calcB = matchup.team_b_points_override ?? subs.filter(s => s.done && s.winner_team_id === matchup.team_b_id).reduce((s, x) => s + x.points_value, 0)
    if (calcA === calcB) return null // tie — needs manual resolution via winner override
    const winnerId = calcA > calcB ? matchup.team_a_id : matchup.team_b_id
    const loserId = calcA > calcB ? matchup.team_b_id : matchup.team_a_id
    return { winnerId, loserId }
  }

  async function generateQ1AndEliminator() {
    const top4 = standings.slice(0, 4)
    if (top4.length < 4) { alert('Need at least 4 teams with standings to generate the knockout stage.'); return }
    const ok = confirm(`Generate Qualifier 1 (${top4[0].team_name} vs ${top4[1].team_name}) and Eliminator (${top4[2].team_name} vs ${top4[3].team_name})?`)
    if (!ok) return
    const { error } = await supabase.from('matchups').insert([
      { stage: 'qualifier1', team_a_id: top4[0].team_id, team_b_id: top4[1].team_id, status: 'scheduled' },
      { stage: 'eliminator', team_a_id: top4[2].team_id, team_b_id: top4[3].team_id, status: 'scheduled' },
    ])
    if (error) { alert(error.message); return }
    loadAll()
  }

  async function generateQ2() {
    const q1Result = await getWinnerLoser(q1)
    const elimResult = await getWinnerLoser(elim)
    if (!q1Result) { alert('Qualifier 1 is tied. Set a winner override on it first (see below).'); return }
    if (!elimResult) { alert('Eliminator is tied. Set a winner override on it first.'); return }
    const { error } = await supabase.from('matchups').insert({
      stage: 'qualifier2', team_a_id: q1Result.loserId, team_b_id: elimResult.winnerId, status: 'scheduled',
    })
    if (error) { alert(error.message); return }
    loadAll()
  }

  async function generateFinal() {
    const q1Result = await getWinnerLoser(q1)
    const q2Result = await getWinnerLoser(q2)
    if (!q1Result || !q2Result) { alert('Resolve any ties in Qualifier 1 / Qualifier 2 first.'); return }
    const { error } = await supabase.from('matchups').insert({
      stage: 'final', team_a_id: q1Result.winnerId, team_b_id: q2Result.winnerId, status: 'scheduled',
    })
    if (error) { alert(error.message); return }
    loadAll()
  }

  if (loading) return <div className="loading-note">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h1>Knockout Stage</h1>
        <p>IPL-style playoff: Qualifier 1, Eliminator, Qualifier 2, Final</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <div>
            <h3 style={{ margin: 0 }}>Public Platform Display</h3>
            <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem', margin: '4px 0 0' }}>
              Controls whether the TV/phone public view shows the league standings table or the knockout bracket.
            </p>
          </div>
          <button className={`btn ${showBracket ? 'secondary' : ''}`} onClick={toggleBracket} disabled={togglingBracket}>
            {togglingBracket ? 'Switching...' : (showBracket ? 'Showing Bracket - Switch to Standings' : 'Showing Standings - Switch to Bracket')}
          </button>
        </div>

        {showBracket && (
          <div style={{ marginTop: 18, borderTop: '2px solid var(--surface-2)', paddingTop: 16 }}>
            <label>Live Court to Show on Public View</label>
            <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.82rem', marginTop: 0, marginBottom: 10 }}>
              During knockout, only one court is actually in use at a time. Pick which one the TV and phone
              views should show live scores for - the other court's panel is hidden, and the bracket expands
              to fill that space instead.
            </p>
            <div className="field-row" style={{ alignItems: 'center' }}>
              <select value={knockoutCourt} onChange={e => saveKnockoutCourt(e.target.value)} disabled={savingCourt} style={{ maxWidth: 220 }}>
                <option value="">Not set</option>
                <option value="Court N">Court N</option>
                <option value="Court B">Court B</option>
              </select>
              {savingCourt && <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '.85rem' }}>Saving…</span>}
            </div>
          </div>
        )}

        <div style={{ marginTop: 18, borderTop: '2px solid var(--surface-2)', paddingTop: 16 }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div>
              <h3 style={{ margin: 0 }}>Champion Banner</h3>
              <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem', margin: '4px 0 0' }}>
                Shows a persistent gold "Congratulations" banner with the winning team on the public TV and
                phone views, once the Final is decided. You control exactly when this appears.
              </p>
            </div>
            <button className={`btn pink ${championBanner ? 'secondary' : ''}`} onClick={toggleChampionBanner} disabled={togglingBanner}>
              {togglingBanner ? 'Switching…' : (championBanner ? 'Banner Showing - Hide It' : 'Show Champion Banner')}
            </button>
          </div>
        </div>
      </div>

      {!groupComplete && (
        <div className="card">
          <p style={{ color: 'var(--muted)', fontWeight: 700 }}>
            All 15 group-stage face-offs must be marked complete before the knockout stage can be generated.
            Check the Standings page to see what's still outstanding.
          </p>
        </div>
      )}

      {groupComplete && !q1 && (
        <div className="card">
          <h3>Top 4 Teams</h3>
          <table>
            <thead><tr><th>Rank</th><th>Team</th><th>Faceoffs</th><th>DW</th><th>DL</th><th>SW</th><th>SL</th><th>Points</th></tr></thead>
            <tbody>
              {standings.slice(0, 4).map(s => (
                <tr key={s.team_id}>
                  <td>{s.league_rank}</td><td><b>{s.team_name}</b></td>
                  <td>{s.matches_played}</td><td>{s.doubles_won}</td><td>{s.doubles_lost}</td>
                  <td>{s.singles_won}</td><td>{s.singles_lost}</td><td>{s.cumulative_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" style={{ marginTop: 14 }} onClick={generateQ1AndEliminator}>
            Generate Qualifier 1 &amp; Eliminator
          </button>
        </div>
      )}

      {q1 && <KnockoutMatchupCard matchup={q1} label="Qualifier 1" onChanged={loadAll} />}
      {elim && <KnockoutMatchupCard matchup={elim} label="Eliminator" onChanged={loadAll} />}

      {q1 && elim && q1.status === 'complete' && elim.status === 'complete' && !q2 && (
        <div className="card">
          <button className="btn" onClick={generateQ2}>Generate Qualifier 2</button>
        </div>
      )}

      {q2 && <KnockoutMatchupCard matchup={q2} label="Qualifier 2" onChanged={loadAll} />}

      {q2 && q2.status === 'complete' && !final && (
        <div className="card">
          <button className="btn" onClick={generateFinal}>Generate Final</button>
        </div>
      )}

      {final && <KnockoutMatchupCard matchup={final} label="Final" onChanged={loadAll} isFinal />}
    </div>
  )
}

function KnockoutMatchupCard({ matchup, label, onChanged, isFinal }) {
  const [subMatches, setSubMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [winnerOverride, setWinnerOverride] = useState(matchup.winner_team_id_override || '')
  const [generatingCode, setGeneratingCode] = useState(false)

  useEffect(() => { loadSubs() }, [matchup.id])

  async function loadSubs() {
    setLoading(true)
    const { data } = await supabase.from('sub_matches').select('*').eq('matchup_id', matchup.id).order('match_type').order('slot_number')
    setSubMatches(data || [])
    setLoading(false)
  }

  const calcA = subMatches.filter(s => s.done && s.winner_team_id === matchup.team_a_id).reduce((s, x) => s + x.points_value, 0)
  const calcB = subMatches.filter(s => s.done && s.winner_team_id === matchup.team_b_id).reduce((s, x) => s + x.points_value, 0)

  async function markComplete() {
    const { error } = await supabase.from('matchups').update({ status: 'complete' }).eq('id', matchup.id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  async function saveWinnerOverride() {
    const { error } = await supabase.from('matchups').update({
      winner_team_id_override: winnerOverride || null,
    }).eq('id', matchup.id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  async function generateCode() {
    if (matchup.otp) {
      const ok = confirm('This face-off already has a code. Generating a new one will invalidate the old one for any referee who already has it. Continue?')
      if (!ok) return
    }
    setGeneratingCode(true)
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const { error } = await supabase.from('matchups').update({ otp: code }).eq('id', matchup.id)
    setGeneratingCode(false)
    if (error) { alert(error.message); return }
    onChanged()
  }

  return (
    <div className="card">
      <div className="toolbar">
        <h3 style={{ margin: 0 }}>{label}: {matchup.team_a?.name} vs {matchup.team_b?.name}</h3>
        <span className={`pill ${matchup.status === 'complete' ? 'done' : 'pending'}`}>{matchup.status}</span>
      </div>
      <div className="toolbar" style={{ marginTop: -8 }}>
        <label style={{ marginBottom: 0 }}>Referee Code</label>
        {matchup.otp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: 'var(--teal)' }}>{matchup.otp}</span>
            <button className="btn secondary small" onClick={generateCode} disabled={generatingCode}>Regenerate</button>
          </div>
        ) : (
          <button className="btn small" onClick={generateCode} disabled={generatingCode}>
            {generatingCode ? 'Generating...' : 'Generate Code'}
          </button>
        )}
      </div>
      <p style={{ color: 'var(--muted)', fontWeight: 700 }}>
        Calculated: <b>{matchup.team_a?.name} {calcA}</b> vs <b>{calcB} {matchup.team_b?.name}</b>.
        Lineups and scoring for this face-off work exactly like the group stage. Enter lineups under
        the Lineups page, referees score sub-matches from the Referee Scoring App.
      </p>

      {!loading && subMatches.length > 0 && (
        <table>
          <thead><tr><th>Match</th><th>Score</th><th>Pts</th></tr></thead>
          <tbody>
            {subMatches.map(sm => (
              <tr key={sm.id}>
                <td>{labelForType(sm.match_type)} #{sm.slot_number}</td>
                <td>{sm.done ? `${sm.team_a_score} - ${sm.team_b_score}` : <span className="pill pending">not played</span>}</td>
                <td>{sm.points_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {calcA === calcB && (
        <div style={{ marginTop: 14 }}>
          <label>Tied at {calcA} points each. Set the winner manually</label>
          <div className="field-row" style={{ alignItems: 'flex-end' }}>
            <select value={winnerOverride} onChange={e => setWinnerOverride(e.target.value)} style={{ flex: 1 }}>
              <option value="">Select winner</option>
              <option value={matchup.team_a_id}>{matchup.team_a?.name}</option>
              <option value={matchup.team_b_id}>{matchup.team_b?.name}</option>
            </select>
            <button className="btn pink" onClick={saveWinnerOverride}>Save Winner</button>
          </div>
        </div>
      )}

      {matchup.status !== 'complete' && (
        <button className="btn secondary" style={{ marginTop: 14 }} onClick={markComplete}>
          Mark This Face-off Complete
        </button>
      )}
    </div>
  )
}
