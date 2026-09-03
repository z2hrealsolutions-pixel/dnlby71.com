import React from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/import', label: 'Import Season Data' },
  { to: '/teams', label: 'Teams & Players' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/lineups', label: 'Lineups' },
  { to: '/standings', label: 'Standings & Scores' },
  { to: '/knockout', label: 'Knockout Stage' },
  { to: '/export', label: 'Export to DUPR' },
]

export default function Layout({ children }) {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          DNL Admin
          <small>DUPR Night League</small>
        </div>
        <nav>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => isActive ? 'active' : ''}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="signout">
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
