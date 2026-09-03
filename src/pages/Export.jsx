import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { labelForType, DUPR_STAGE_LABELS } from '../constants'

const LOCATION = 'Picklebee by 71, 980/2, E W, Perera Mawatha, Colombo 10100'
const SCORE_TYPE = 'SIDEOUT'

const CSV_COLUMNS = [
  'matchType', 'event', 'date',
  'playerA1', 'playerA1DuprId', 'playerA1ExternalId',
  'playerA2', 'playerA2DuprId', 'playerA2ExternalId',
  'playerB1', 'playerB1DuprId', 'playerB1ExternalId',
  'playerB2', 'playerB2DuprId', 'playerB2ExternalId',
  'teamAGame1', 'teamBGame1', 'teamAGame2', 'teamBGame2',
  'teamAGame3', 'teamBGame3', 'teamAGame4', 'teamBGame4', 'teamAGame5', 'teamBGame5',
  'location', 'scoreType',
]

function cleanDuprId(id) {
  return id || '' // players table already keeps dupr_id and dupr_email separate — no tagging needed here
}

function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function buildEventName(stage, teamAName, teamBName, matchTypeLabel, slotNumber) {
  const stageText = DUPR_STAGE_LABELS[stage] || stage
  return `DNL ${stageText} ${teamAName} vs ${teamBName} - ${matchTypeLabel} ${slotNumber}`
}

export default function Export() {
  const [matchups, setMatchups] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadMatchups() }, [])

  async function loadMatchups() {
    setLoading(true)
    const { data } = await supabase
      .from('matchups')
      .select('*, team_a:team_a_id(name), team_b:team_b_id(name)')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    setMatchups(data || [])
    setLoading(false)
  }

  async function exportCsv() {
    if (!selectedId) { alert('Select a face-off first.'); return }
    setExporting(true)
    try {
      const matchup = matchups.find(m => m.id === selectedId)
      const { data: subs, error } = await supabase
        .from('sub_matches')
        .select(`
          *,
          lineup_a:lineup_a_id ( player1:player1_id(name, dupr_id, dupr_email), player2:player2_id(name, dupr_id, dupr_email) ),
          lineup_b:lineup_b_id ( player1:player1_id(name, dupr_id, dupr_email), player2:player2_id(name, dupr_id, dupr_email) )
        `)
        .eq('matchup_id', matchup.id)
        .eq('done', true)
      if (error) throw error

      if (!subs || subs.length === 0) { alert('No completed sub-matches to export yet for this face-off.'); setExporting(false); return }

      const dateStr = matchup.scheduled_date || ''
      const rows = subs.map((sm, i) => {
        const isSingles = sm.match_type === 'mens_singles' || sm.match_type === 'womens_singles'
        const a1 = sm.lineup_a?.player1, a2 = sm.lineup_a?.player2
        const b1 = sm.lineup_b?.player1, b2 = sm.lineup_b?.player2
        const ext = slot => `DNL-${matchup.id.slice(0, 8)}-${sm.match_type}-${sm.slot_number}-${slot}`

        return {
          matchType: isSingles ? 'S' : 'D',
          event: buildEventName(matchup.stage, matchup.team_a?.name, matchup.team_b?.name, labelForType(sm.match_type), sm.slot_number),
          date: dateStr,
          playerA1: a1?.name || '', playerA1DuprId: cleanDuprId(a1?.dupr_id), playerA1ExternalId: ext('A1'),
          playerA2: a2?.name || '', playerA2DuprId: a2 ? cleanDuprId(a2?.dupr_id) : '', playerA2ExternalId: a2 ? ext('A2') : '',
          playerB1: b1?.name || '', playerB1DuprId: cleanDuprId(b1?.dupr_id), playerB1ExternalId: ext('B1'),
          playerB2: b2?.name || '', playerB2DuprId: b2 ? cleanDuprId(b2?.dupr_id) : '', playerB2ExternalId: b2 ? ext('B2') : '',
          teamAGame1: sm.team_a_score, teamBGame1: sm.team_b_score,
          teamAGame2: '', teamBGame2: '', teamAGame3: '', teamBGame3: '', teamAGame4: '', teamBGame4: '', teamAGame5: '', teamBGame5: '',
          location: LOCATION,
          scoreType: SCORE_TYPE,
        }
      })

      const lines = [CSV_COLUMNS.join(',')]
      rows.forEach(r => lines.push(CSV_COLUMNS.map(c => csvCell(r[c])).join(',')))
      const csvText = lines.join('\r\n')

      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DNL_${matchup.team_a?.name}_vs_${matchup.team_b?.name}`.replace(/[^a-z0-9]+/gi, '_') + '.csv'
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Could not export.')
    }
    setExporting(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Export to DUPR</h1>
        <p>Download completed results in DUPR's bulk-import CSV format</p>
      </div>

      <div className="card">
        <label>Select Face-off</label>
        {loading ? <div className="loading-note">Loading…</div> : (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choose a face-off</option>
            {matchups.map(m => (
              <option key={m.id} value={m.id}>{m.team_a?.name} vs {m.team_b?.name} ({m.stage}) - {m.status}</option>
            ))}
          </select>
        )}
        <button className="btn" style={{ marginTop: 16 }} onClick={exportCsv} disabled={exporting || !selectedId}>
          {exporting ? 'Preparing…' : 'Export Completed Sub-matches (.csv)'}
        </button>
        <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '.85rem', marginTop: 14 }}>
          Only sub-matches marked as played are included. You can export the same face-off again later
          as more sub-matches get completed. Upload the downloaded file via your DUPR Club's Matches tab,
          Import Matches via CSV (this needs a browser; the DUPR mobile app doesn't support CSV import).
        </p>
      </div>
    </div>
  )
}
