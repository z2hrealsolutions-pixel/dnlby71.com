import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newCaptainName, setNewCaptainName] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)

  useEffect(() => { loadTeams() }, [])

  async function loadTeams() {
    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .order('created_at', { ascending: true })
    if (!error) setTeams(data || [])
    setLoading(false)
  }

  async function addTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setSavingTeam(true)
    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      captain_name: newCaptainName.trim() || null,
    })
    setSavingTeam(false)
    if (error) { alert(error.message); return }
    setNewTeamName(''); setNewCaptainName('')
    loadTeams()
  }

  async function deleteTeam(id) {
    if (!confirm('Delete this team and all its players? This cannot be undone.')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) { alert(error.message); return }
    loadTeams()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Teams &amp; Players</h1>
        <p>Set up all 6 teams and their 12-player rosters</p>
      </div>

      <div className="card">
        <h3>Add a Team</h3>
        <form onSubmit={addTeam} className="field-row" style={{ alignItems: 'flex-end' }}>
          <div className="field">
            <label>Team Name</label>
            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Colombo Cobras" required />
          </div>
          <div className="field">
            <label>Captain</label>
            <input type="text" value={newCaptainName} onChange={e => setNewCaptainName(e.target.value)} placeholder="Captain's name" />
          </div>
          <div className="field" style={{ flex: 'none' }}>
            <button className="btn" type="submit" disabled={savingTeam}>{savingTeam ? 'Adding…' : 'Add Team'}</button>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading-note">Loading teams…</div>
      ) : teams.length === 0 ? (
        <div className="empty-note">No teams yet. Add your first one above.</div>
      ) : (
        teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            expanded={expandedTeam === team.id}
            onToggle={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
            onDeleteTeam={() => deleteTeam(team.id)}
            onChanged={loadTeams}
          />
        ))
      )}
    </div>
  )
}

function TeamCard({ team, expanded, onToggle, onDeleteTeam, onChanged }) {
  const players = team.players || []
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [captainName, setCaptainName] = useState(team.captain_name || '')
  const [saving, setSaving] = useState(false)

  async function saveEdit() {
    if (!name.trim()) { alert('Team name cannot be blank.'); return }
    setSaving(true)
    const { error } = await supabase.from('teams').update({
      name: name.trim(),
      captain_name: captainName.trim() || null,
    }).eq('id', team.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEditing(false)
    onChanged()
  }

  function cancelEdit() {
    setName(team.name)
    setCaptainName(team.captain_name || '')
    setEditing(false)
  }

  return (
    <div className="card">
      <div className="toolbar">
        {editing ? (
          <div className="field-row" style={{ flex: 1, alignItems: 'flex-end' }}>
            <div className="field">
              <label>Team Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Captain</label>
              <input type="text" value={captainName} onChange={e => setCaptainName(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 'none', display: 'flex', gap: 8 }}>
              <button className="btn small" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn secondary small" onClick={cancelEdit}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: 2 }}>{team.name}</h3>
            <div style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '.82rem' }}>
              {team.captain_name ? `Captain: ${team.captain_name} · ` : ''}{players.length} / 12 players
            </div>
          </div>
        )}
        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn secondary small" onClick={onToggle}>
              {expanded ? 'Hide roster' : 'Manage roster'}
            </button>
            <button className="btn danger small" onClick={onDeleteTeam}>Delete team</button>
          </div>
        )}
      </div>

      {expanded && !editing && <RosterEditor team={team} players={players} onChanged={onChanged} />}
    </div>
  )
}

function RosterEditor({ team, players, onChanged }) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('M')
  const [duprId, setDuprId] = useState('')
  const [duprEmail, setDuprEmail] = useState('')
  const [is45, setIs45] = useState(false)
  const [noDuprId, setNoDuprId] = useState(false)
  const [saving, setSaving] = useState(false)

  async function addPlayer(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('players').insert({
      team_id: team.id,
      name: name.trim(),
      gender,
      dupr_id: noDuprId ? null : (duprId.trim() || null),
      dupr_email: noDuprId ? (duprEmail.trim() || null) : null,
      is_45_plus: is45,
    })
    setSaving(false)
    if (error) { alert(error.message); return }
    setName(''); setDuprId(''); setDuprEmail(''); setIs45(false); setNoDuprId(false)
    onChanged()
  }

  async function deletePlayer(id) {
    if (!confirm('Remove this player from the roster?')) return
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (error) { alert(error.message); return }
    onChanged()
  }

  return (
    <div style={{ marginTop: 16, borderTop: '2px solid var(--surface-2)', paddingTop: 16 }}>
      <table>
        <thead>
          <tr><th>Name</th><th>Gender</th><th>DUPR Identity</th><th>45+</th><th></th></tr>
        </thead>
        <tbody>
          {players.map(p => (
            <PlayerRow key={p.id} player={p} onChanged={onChanged} onDelete={() => deletePlayer(p.id)} />
          ))}
          {players.length === 0 && (
            <tr><td colSpan={5} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No players added yet.</td></tr>
          )}
        </tbody>
      </table>

      <form onSubmit={addPlayer} style={{ marginTop: 18 }}>
        <div className="field-row">
          <div className="field">
            <label>Player Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field" style={{ flex: 'none', width: 110 }}>
            <label>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          {!noDuprId ? (
            <div className="field">
              <label>DUPR ID</label>
              <input type="text" value={duprId} onChange={e => setDuprId(e.target.value)} placeholder="e.g. AB12C3" />
            </div>
          ) : (
            <div className="field">
              <label>Email (no DUPR ID yet)</label>
              <input type="email" value={duprEmail} onChange={e => setDuprEmail(e.target.value)} placeholder="player@email.com" />
            </div>
          )}
        </div>
        <div className="field-row" style={{ alignItems: 'center', marginBottom: 14 }}>
          <label className="checkbox-row">
            <input type="checkbox" checked={noDuprId} onChange={e => setNoDuprId(e.target.checked)} />
            Doesn't have a DUPR ID yet
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={is45} onChange={e => setIs45(e.target.checked)} />
            Eligible for 45+ Mixed Doubles
          </label>
        </div>
        <button className="btn" type="submit" disabled={saving || players.length >= 12}>
          {players.length >= 12 ? 'Roster full (12/12)' : (saving ? 'Adding…' : '+ Add Player')}
        </button>
      </form>
    </div>
  )
}

function PlayerRow({ player, onChanged, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player.name)
  const [gender, setGender] = useState(player.gender)
  const [duprId, setDuprId] = useState(player.dupr_id || '')
  const [duprEmail, setDuprEmail] = useState(player.dupr_email || '')
  const [noDuprId, setNoDuprId] = useState(!!player.dupr_email && !player.dupr_id)
  const [is45, setIs45] = useState(player.is_45_plus)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { alert('Name cannot be blank.'); return }
    setSaving(true)
    const { error } = await supabase.from('players').update({
      name: name.trim(),
      gender,
      dupr_id: noDuprId ? null : (duprId.trim() || null),
      dupr_email: noDuprId ? (duprEmail.trim() || null) : null,
      is_45_plus: is45,
    }).eq('id', player.id)
    setSaving(false)
    if (error) { alert(error.message); return }
    setEditing(false)
    onChanged()
  }

  function cancel() {
    setName(player.name); setGender(player.gender)
    setDuprId(player.dupr_id || ''); setDuprEmail(player.dupr_email || '')
    setNoDuprId(!!player.dupr_email && !player.dupr_id); setIs45(player.is_45_plus)
    setEditing(false)
  }

  if (!editing) {
    return (
      <tr>
        <td>{player.name}</td>
        <td>{player.gender}</td>
        <td>{player.dupr_id || (player.dupr_email ? `email: ${player.dupr_email}` : '-')}</td>
        <td>{player.is_45_plus ? 'Yes' : ''}</td>
        <td style={{ display: 'flex', gap: 6 }}>
          <button className="btn secondary small" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn danger small" onClick={onDelete}>Remove</button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td><input type="text" value={name} onChange={e => setName(e.target.value)} /></td>
      <td>
        <select value={gender} onChange={e => setGender(e.target.value)}>
          <option value="M">M</option><option value="F">F</option>
        </select>
      </td>
      <td>
        {!noDuprId ? (
          <input type="text" value={duprId} onChange={e => setDuprId(e.target.value)} placeholder="DUPR ID" />
        ) : (
          <input type="email" value={duprEmail} onChange={e => setDuprEmail(e.target.value)} placeholder="email" />
        )}
        <label className="checkbox-row" style={{ marginTop: 4, fontSize: '.72rem' }}>
          <input type="checkbox" checked={noDuprId} onChange={e => setNoDuprId(e.target.checked)} />
          no DUPR ID yet
        </label>
      </td>
      <td>
        <label className="checkbox-row">
          <input type="checkbox" checked={is45} onChange={e => setIs45(e.target.checked)} />
        </label>
      </td>
      <td style={{ display: 'flex', gap: 6 }}>
        <button className="btn small" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</button>
        <button className="btn secondary small" onClick={cancel}>Cancel</button>
      </td>
    </tr>
  )
}
