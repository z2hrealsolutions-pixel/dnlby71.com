import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { MATCH_TYPES, pointsForType } from '../constants'
import PlayerCombobox from '../components/PlayerCombobox.jsx'

export default function Lineups() {
  const [matchups, setMatchups] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMatchups() }, [])

  async function loadMatchups() {
    setLoading(true)
    const { data } = await supabase
      .from('matchups')
      .select('*, team_a:team_a_id(id,name), team_b:team_b_id(id,name)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    setMatchups(data || [])
    setLoading(false)
  }

  const selected = matchups.find(m => m.id === selectedId)

  return (
    <div>
      <div className="page-header">
        <h1>Lineups</h1>
        <p>Enter each team's lineup before their face-off is played</p>
      </div>

      <div className="card">
        <label>Select Face-off</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          <option value="">Choose a face-off</option>
          {matchups.map(m => (
            <option key={m.id} value={m.id}>
              {m.team_a?.name} vs {m.team_b?.name} {m.scheduled_date ? `(${m.scheduled_date})` : ''} ({m.status})
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="loading-note">Loading face-offs…</div>}

      {selected && <LineupEditor matchup={selected} />}
    </div>
  )
}

function LineupEditor({ matchup }) {
  const [rosterA, setRosterA] = useState([])
  const [rosterB, setRosterB] = useState([])
  const [existingLineups, setExistingLineups] = useState([])
  const [selections, setSelections] = useState({}) // key: `${teamSide}_${matchType}_${slot}` -> {p1, p2}
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [matchup.id])

  async function loadData() {
    setLoading(true)
    const [rosterARes, rosterBRes, lineupsRes] = await Promise.all([
      supabase.from('players').select('*').eq('team_id', matchup.team_a_id),
      supabase.from('players').select('*').eq('team_id', matchup.team_b_id),
      supabase.from('lineups').select('*').eq('matchup_id', matchup.id),
    ])
    setRosterA(rosterARes.data || [])
    setRosterB(rosterBRes.data || [])
    setExistingLineups(lineupsRes.data || [])

    const initial = {}
    ;(lineupsRes.data || []).forEach(l => {
      const side = l.team_id === matchup.team_a_id ? 'a' : 'b'
      initial[`${side}_${l.match_type}_${l.slot_number}`] = { p1: l.player1_id, p2: l.player2_id || '' }
    })
    setSelections(initial)
    setLoading(false)
  }

  function setSelection(side, matchType, slot, field, value) {
    const key = `${side}_${matchType}_${slot}`
    setSelections(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function eligiblePlayers(roster, typeConfig) {
    return roster.filter(p => {
      if (typeConfig.genderReq && p.gender !== typeConfig.genderReq) return false
      if (typeConfig.requires45 && !p.is_45_plus) return false
      return true
    })
  }

  async function saveLineups() {
    setSaving(true)
    try {
      const lineupRows = []
      const rosterBySide = { a: rosterA, b: rosterB }
      const teamIdBySide = { a: matchup.team_a_id, b: matchup.team_b_id }

      for (const type of MATCH_TYPES) {
        for (let slot = 1; slot <= type.slots; slot++) {
          for (const side of ['a', 'b']) {
            const sel = selections[`${side}_${type.key}_${slot}`]
            if (!sel || !sel.p1) continue
            lineupRows.push({
              matchup_id: matchup.id,
              team_id: teamIdBySide[side],
              match_type: type.key,
              slot_number: slot,
              player1_id: sel.p1,
              player2_id: type.isDoubles ? (sel.p2 || null) : null,
            })
          }
        }
      }

      if (lineupRows.length === 0) { alert('Select at least one player before saving.'); setSaving(false); return }

      // Upsert lineups (unique on matchup_id, team_id, match_type, slot_number)
      const { data: savedLineups, error: lineupErr } = await supabase
        .from('lineups')
        .upsert(lineupRows, { onConflict: 'matchup_id,team_id,match_type,slot_number' })
        .select()
      if (lineupErr) throw lineupErr

      // For every match_type+slot where BOTH sides now have a lineup, ensure a
      // sub_match row exists linking them — this is what the Referee Scoring
      // App will actually score against.
      const bySlot = {}
      savedLineups.forEach(l => {
        const key = `${l.match_type}_${l.slot_number}`
        if (!bySlot[key]) bySlot[key] = {}
        const side = l.team_id === matchup.team_a_id ? 'a' : 'b'
        bySlot[key][side] = l.id
      })

      const subMatchRows = []
      Object.entries(bySlot).forEach(([key, sides]) => {
        if (!sides.a || !sides.b) return // only create once both teams have a lineup for this slot
        const [matchType, slotStr] = key.split(/_(\d+)$/)
        subMatchRows.push({
          matchup_id: matchup.id,
          match_type: matchType,
          slot_number: Number(slotStr),
          lineup_a_id: sides.a,
          lineup_b_id: sides.b,
          points_value: pointsForType(matchType),
        })
      })

      if (subMatchRows.length > 0) {
        const { error: subErr } = await supabase
          .from('sub_matches')
          .upsert(subMatchRows, { onConflict: 'matchup_id,match_type,slot_number' })
        if (subErr) throw subErr
      }

      alert('Lineups saved. Sub-matches are ready for the Referee Scoring App.')
      loadData()
    } catch (err) {
      alert(err.message || 'Could not save lineups.')
    }
    setSaving(false)
  }

  if (loading) return <div className="loading-note">Loading rosters…</div>

  return (
    <div className="card">
      <h3>{matchup.team_a?.name} vs {matchup.team_b?.name}</h3>
      {MATCH_TYPES.map(type => (
        <div key={type.key} style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
            {type.label} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>({type.isDoubles ? 2 : 3} pts each)</span>
          </div>
          {Array.from({ length: type.slots }, (_, i) => i + 1).map(slot => (
            <div key={slot} className="field-row" style={{ marginBottom: 8, alignItems: 'center' }}>
              <div style={{ width: 50, fontWeight: 800, color: 'var(--muted)' }}>#{slot}</div>
              <TeamSlotSelect side="a" teamName={matchup.team_a?.name} roster={eligiblePlayers(rosterA, type)}
                type={type} value={selections[`a_${type.key}_${slot}`]}
                onChange={(field, v) => setSelection('a', type.key, slot, field, v)} />
              <div style={{ fontWeight: 800, color: 'var(--muted)' }}>vs</div>
              <TeamSlotSelect side="b" teamName={matchup.team_b?.name} roster={eligiblePlayers(rosterB, type)}
                type={type} value={selections[`b_${type.key}_${slot}`]}
                onChange={(field, v) => setSelection('b', type.key, slot, field, v)} />
            </div>
          ))}
        </div>
      ))}
      <button className="btn" onClick={saveLineups} disabled={saving}>
        {saving ? 'Saving…' : 'Save Lineups'}
      </button>
    </div>
  )
}

function TeamSlotSelect({ teamName, roster, type, value, onChange }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 6 }}>
      <PlayerCombobox roster={roster} value={value?.p1 || ''} onSelect={id => onChange('p1', id)}
        placeholder={`${teamName} - select player`} />
      {type.isDoubles && (
        <PlayerCombobox roster={roster.filter(p => p.id !== value?.p1)} value={value?.p2 || ''}
          onSelect={id => onChange('p2', id)} placeholder="+ partner" />
      )}
    </div>
  )
}
