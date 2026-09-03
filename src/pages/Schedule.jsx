import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Schedule() {
  const [teams, setTeams] = useState([])
  const [matchups, setMatchups] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [teamsRes, matchupsRes] = await Promise.all([
      supabase.from('teams').select('id, name').order('created_at'),
      supabase.from('matchups')
        .select('*, team_a:team_a_id(name), team_b:team_b_id(name)')
        .eq('stage', 'group')
        .order('scheduled_date', { ascending: true, nullsFirst: true }),
    ])
    setTeams(teamsRes.data || [])
    setMatchups(matchupsRes.data || [])
    setLoading(false)
  }

  async function generateRoundRobin() {
    if (teams.length < 2) { alert('Add at least 2 teams first.'); return }
    if (matchups.length > 0) {
      const ok = confirm(
        `This will DELETE all ${matchups.length} existing group-stage face-offs, including any lineups ` +
        `and scores already entered for them, and generate a fresh schedule. Are you sure?`
      )
      if (!ok) return
    }
    setGenerating(true)

    if (matchups.length > 0) {
      const ids = matchups.map(m => m.id)
      await supabase.from('matchups').delete().in('id', ids)
    }

    const rows = []
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        rows.push({ stage: 'group', team_a_id: teams[i].id, team_b_id: teams[j].id, status: 'scheduled' })
      }
    }
    const { error } = await supabase.from('matchups').insert(rows)
    setGenerating(false)
    if (error) { alert(error.message); return }
    loadAll()
  }

  async function updateMatchup(id, fields) {
    const { error } = await supabase.from('matchups').update(fields).eq('id', id)
    if (error) { alert(error.message); return }
    // The public platform reads a live match's court from sub_matches, not
    // matchups (that's what lets a single sub-match be rescheduled to a
    // different court independently, like the Golden Stingers Over-40
    // case). A normal court change here should apply to every one of this
    // matchup's sub-matches too, or it won't actually show up publicly.
    if (fields.court !== undefined) {
      await supabase.from('sub_matches').update({ court: fields.court }).eq('matchup_id', id)
    }
    loadAll()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Schedule</h1>
        <p>Round-robin: every team plays every other team once ({teams.length > 1 ? (teams.length * (teams.length - 1)) / 2 : 0} face-offs)</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>{matchups.length > 0 ? 'Regenerate Schedule' : 'Generate Schedule'}</h3>
          <button className="btn" onClick={generateRoundRobin} disabled={generating}>
            {generating ? 'Generating…' : (matchups.length > 0 ? 'Regenerate Round Robin' : 'Generate Round Robin')}
          </button>
        </div>
        {matchups.length > 0 && (
          <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem', margin: 0 }}>
            Regenerating deletes all existing face-offs for the group stage, including any lineups or scores
            already entered. Only do this before the tournament starts, or if you genuinely need to start over.
          </p>
        )}
      </div>

      {loading ? (
        <div className="loading-note">Loading…</div>
      ) : matchups.length === 0 ? (
        <div className="empty-note">No schedule yet. Generate one above once your teams are set up.</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Face-off</th><th>Status</th><th>Date</th><th>Time</th><th>Court</th><th>Referee Code</th></tr>
            </thead>
            <tbody>
              {matchups.map(m => (
                <MatchupRow key={m.id} matchup={m} onSave={updateMatchup} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MatchupRow({ matchup, onSave }) {
  const [date, setDate] = useState(matchup.scheduled_date || '')
  const [time, setTime] = useState(matchup.scheduled_time || '')
  const [court, setCourt] = useState(matchup.court || '')
  const [generating, setGenerating] = useState(false)

  function save() {
    onSave(matchup.id, { scheduled_date: date || null, scheduled_time: time || null, court: court || null })
  }

  async function generateCode() {
    if (matchup.otp) {
      const ok = confirm('This face-off already has a code. Generating a new one will invalidate the old one for any referee who already has it. Continue?')
      if (!ok) return
    }
    setGenerating(true)
    const code = String(Math.floor(1000 + Math.random() * 9000))
    await onSave(matchup.id, { otp: code })
    setGenerating(false)
  }

  return (
    <tr>
      <td><b>{matchup.team_a?.name}</b> vs <b>{matchup.team_b?.name}</b></td>
      <td><span className={`pill ${matchup.status === 'complete' ? 'done' : 'pending'}`}>{matchup.status}</span></td>
      <td><input type="date" value={date} onChange={e => setDate(e.target.value)} onBlur={save} style={{ minWidth: 140 }} /></td>
      <td><input type="text" placeholder="e.g. 6:00 PM" value={time} onChange={e => setTime(e.target.value)} onBlur={save} style={{ minWidth: 110 }} /></td>
      <td><input type="text" placeholder="e.g. Court 1" value={court} onChange={e => setCourt(e.target.value)} onBlur={save} style={{ minWidth: 100 }} /></td>
      <td>
        {matchup.otp ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: 'var(--teal)' }}>{matchup.otp}</span>
            <button className="btn secondary small" onClick={generateCode} disabled={generating}>Regenerate</button>
          </div>
        ) : (
          <button className="btn small" onClick={generateCode} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Code'}
          </button>
        )}
      </td>
    </tr>
  )
}
