import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { pointsForType } from '../constants'
import { IMPORT_PLAYERS, IMPORT_MATCHUPS, KNOCKOUT_SCHEDULE_REFERENCE } from '../importData'

export default function Import() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  function addLog(msg) {
    setLog(prev => [...prev, msg])
  }

  async function runImport() {
    const ok = confirm(
      'This will import 6 teams, 72 players, and 15 group-stage face-offs with their full ' +
      'match schedules from your real DNL data. Only run this once, on a fresh database. Continue?'
    )
    if (!ok) return

    setRunning(true)
    setLog([])
    setDone(false)

    // Pre-flight check: catch existing data BEFORE attempting any inserts,
    // so this fails with a clear message instead of a raw database error
    // partway through.
    const { count, error: checkErr } = await supabase.from('teams').select('id', { count: 'exact', head: true })
    if (checkErr) { addLog('ERROR checking existing data: ' + checkErr.message); setRunning(false); return }
    if (count > 0) {
      addLog(`STOPPED: ${count} team(s) already exist in the database. This import is designed to run once ` +
        `on an empty database - running it again would create duplicates. If this is leftover test data, ` +
        `clear it first (see the reset script provided), then try again.`)
      setRunning(false)
      return
    }

    try {
      // 1. Teams
      const teamNames = [...new Set(IMPORT_PLAYERS.map(p => p.team))]
      addLog(`Creating ${teamNames.length} teams...`)
      const { data: teamRows, error: teamErr } = await supabase
        .from('teams').insert(teamNames.map(name => ({ name }))).select()
      if (teamErr) throw teamErr
      const teamIdByName = Object.fromEntries(teamRows.map(t => [t.name, t.id]))
      addLog('Teams created.')

      // 2. Players
      addLog(`Creating ${IMPORT_PLAYERS.length} players...`)
      const playerRows = IMPORT_PLAYERS.map(p => ({
        team_id: teamIdByName[p.team],
        name: p.name,
        gender: p.gender,
        dupr_id: p.dupr_id,
        is_45_plus: p.is_45_plus,
      }))
      const { error: playerErr } = await supabase.from('players').insert(playerRows)
      if (playerErr) throw playerErr
      addLog('Players created.')

      // 3. Matchups
      addLog(`Creating ${IMPORT_MATCHUPS.length} group-stage face-offs...`)
      const matchupRows = IMPORT_MATCHUPS.map(m => ({
        stage: 'group',
        team_a_id: teamIdByName[m.team_a],
        team_b_id: teamIdByName[m.team_b],
        status: 'scheduled',
        scheduled_date: m.date,
        court: m.court,
      }))
      const { data: savedMatchups, error: matchupErr } = await supabase
        .from('matchups').insert(matchupRows).select()
      if (matchupErr) throw matchupErr
      addLog('Face-offs created.')

      // 4. Sub-matches (lineups not yet known - captains decide these on the day)
      addLog('Creating sub-match slots for all face-offs...')
      const subMatchRows = []
      IMPORT_MATCHUPS.forEach((m, i) => {
        const matchupId = savedMatchups[i].id
        m.sub_matches.forEach(sm => {
          subMatchRows.push({
            matchup_id: matchupId,
            match_type: sm.match_type,
            slot_number: sm.slot_number,
            points_value: pointsForType(sm.match_type),
            court: sm.court,
            scheduled_time: sm.time,
          })
        })
      })
      const { error: subErr } = await supabase.from('sub_matches').insert(subMatchRows)
      if (subErr) throw subErr
      addLog(`${subMatchRows.length} sub-match slots created.`)

      addLog('Import complete. Lineups still need to be entered by the admin on the day, per captain.')
      setDone(true)
    } catch (err) {
      addLog('ERROR: ' + (err.message || String(err)))
    }
    setRunning(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Import Real Season Data</h1>
        <p>One-time import of the confirmed team rosters and match schedule</p>
      </div>

      <div className="card">
        <h3>What This Imports</h3>
        <p style={{ color: 'var(--muted)', fontWeight: 600, lineHeight: 1.7 }}>
          6 teams, 72 players (with DUPR ID where known, gender, and Over 40 eligibility for the
          last 2 players listed per team), and all 15 group-stage face-offs with their full 9-match
          schedules - including Golden Stingers' two Over 40 matches correctly attributed to Tie-Up 1
          and Tie-Up 3's points, even though they're physically played during Tie-Up 9 and Tie-Up 10's
          time slots.
        </p>
        <p style={{ color: 'var(--muted)', fontWeight: 600, lineHeight: 1.7 }}>
          This does not import lineups - who plays which role in each face-off is decided by each
          team's captain on the day, entered via the Lineups page.
        </p>
        <p style={{ color: 'var(--danger)', fontWeight: 700 }}>
          Only run this once, on a database with no teams yet. Running it twice will create duplicates.
        </p>
        <button className="btn" onClick={runImport} disabled={running || done}>
          {running ? 'Importing...' : (done ? 'Import Complete' : 'Run Import')}
        </button>
      </div>

      {log.length > 0 && (
        <div className="card">
          <h3>Log</h3>
          {log.map((line, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: '.85rem', padding: '4px 0', color: line.startsWith('ERROR') ? 'var(--danger)' : 'var(--ink)' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Knockout Stage Schedule (Reference Only)</h3>
        <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem' }}>
          Not imported automatically - the Knockout page creates these once real standings exist.
          Enter these date/time/court values manually there when each stage is generated.
        </p>
        <table>
          <thead><tr><th>Stage</th><th>Date</th><th>Court</th><th>First Match Time</th></tr></thead>
          <tbody>
            {KNOCKOUT_SCHEDULE_REFERENCE.map(k => (
              <tr key={k.tie_up}>
                <td>{k.tie_up}</td><td>{k.date}</td><td>{k.court}</td>
                <td>{k.sub_matches[0]?.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
