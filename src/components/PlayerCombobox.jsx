import React, { useState, useRef, useEffect } from 'react'

// A player picker that works both ways: click it to see every eligible
// player as a dropdown, or start typing to filter the list down instantly.
// Selecting a player (by click or keyboard) fills the field either way.
export default function PlayerCombobox({ roster, value, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)

  const selectedPlayer = roster.find(p => p.id === value)

  useEffect(() => {
    setQuery(selectedPlayer ? selectedPlayer.name : '')
  }, [value, selectedPlayer])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = roster.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  function pick(player) {
    onSelect(player.id)
    setQuery(player.name)
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) { if (e.key === 'ArrowDown') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) pick(filtered[highlight]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setHighlight(0) }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); if (!e.target.value) onSelect('') }}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', borderRadius: 10, boxShadow: '0 6px 20px rgba(19,45,85,.18)',
          marginTop: 4, maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map((p, i) => (
            <div key={p.id}
              onMouseDown={() => pick(p)}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '.88rem',
                background: i === highlight ? 'var(--surface-2)' : 'transparent',
              }}>
              {p.name}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', borderRadius: 10, boxShadow: '0 6px 20px rgba(19,45,85,.18)',
          marginTop: 4, padding: '9px 12px', color: 'var(--muted)', fontWeight: 700, fontSize: '.85rem',
        }}>
          No matching players
        </div>
      )}
    </div>
  )
}
