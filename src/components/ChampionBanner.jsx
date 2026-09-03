import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import TeamName from './TeamName.jsx'
import Logo from './Logo.jsx'

const CONFETTI_COLORS = ['#F4B93E', '#01F6D8', '#A8E305', '#FE00BC', '#1CA686', '#FFFFFF']

function ConfettiPiece({ id }) {
  const left = Math.random() * 100
  const size = 6 + Math.random() * 8
  const isCircle = Math.random() > 0.5
  const duration = 3.2 + Math.random() * 2.4
  const delay = Math.random() * 0.6
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]

  return (
    <motion.div
      style={{
        position: 'absolute', top: -20, left: `${left}vw`,
        width: size, height: isCircle ? size : size * 1.6,
        background: color, borderRadius: isCircle ? '50%' : 2,
      }}
      initial={{ y: 0, opacity: 0.95, rotate: 0 }}
      animate={{ y: '110vh', opacity: 0.2, rotate: 720 }}
      transition={{ duration, delay, ease: 'linear' }}
      key={id}
    />
  )
}

// A persistent, full-screen celebration - admin-triggered, stays up until
// the admin turns it off again. A confetti trickle keeps it feeling alive
// without being exhausting to look at for hours.
export default function ChampionBanner({ teamName }) {
  const [pieces, setPieces] = useState([])

  useEffect(() => {
    const initial = Array.from({ length: 140 }, (_, i) => i)
    setPieces(initial)
    let next = initial.length
    const interval = setInterval(() => {
      setPieces(prev => [...prev.slice(-200), next++])
    }, 900)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="champion-shell">
      <div className="confetti-layer">
        {pieces.map(id => <ConfettiPiece key={id} id={id} />)}
      </div>

      <motion.div
        className="champion-card"
        initial={{ opacity: 0, scale: 0.7, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.2, 0.9, 0.25, 1.2] }}
      >
        <div className="champion-logo"><Logo height={48} /></div>

        <motion.div
          className="champion-trophy"
          animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" fill="none" width="88" height="88">
            <path d="M7 4H17V10C17 12.7614 14.7614 15 12 15C9.23858 15 7 12.7614 7 10V4Z" stroke="#F4B93E" strokeWidth="1.4" fill="rgba(244,185,62,.18)"/>
            <path d="M7 5H4V7C4 8.65685 5.34315 10 7 10" stroke="#F4B93E" strokeWidth="1.4"/>
            <path d="M17 5H20V7C20 8.65685 18.6569 10 17 10" stroke="#F4B93E" strokeWidth="1.4"/>
            <line x1="12" y1="15" x2="12" y2="19" stroke="#F4B93E" strokeWidth="1.4"/>
            <path d="M9 19H15L16 21H8L9 19Z" stroke="#F4B93E" strokeWidth="1.4" fill="rgba(244,185,62,.18)"/>
          </svg>
        </motion.div>

        <div className="champion-congrats">CONGRATULATIONS</div>
        {teamName ? (
          <TeamName name={teamName} className="champion-team-name" />
        ) : (
          <div className="champion-team-name">Champions</div>
        )}
        <div className="champion-subtitle">DNL Champions</div>
      </motion.div>
    </div>
  )
}
