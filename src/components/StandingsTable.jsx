import React from 'react'
import { motion } from 'framer-motion'
import TeamName from './TeamName.jsx'

export default function StandingsTable({ standings }) {
  return (
    <table className="standings-table">
      <colgroup>
        <col style={{ width: '8%' }} />
        <col className="team-col" />
        <col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>Team</th><th>FO</th><th>DW</th><th>DL</th><th>SW</th><th>SL</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {(standings || []).map((s, i) => (
          <motion.tr
            key={s.team_id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.03 }}
            className={s.league_rank <= 4 ? 'qualifying' : ''}
          >
            <td className="rank-num">{s.league_rank}</td>
            <td><TeamName name={s.team_name} /></td>
            <td>{s.matches_played}</td>
            <td>{s.doubles_won}</td>
            <td>{s.doubles_lost}</td>
            <td>{s.singles_won}</td>
            <td>{s.singles_lost}</td>
            <td>{s.cumulative_points}</td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  )
}
