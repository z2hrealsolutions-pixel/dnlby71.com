import React from 'react'
import { TEAM_COLORS } from '../constants'

const GLOW = 'drop-shadow(0 0 3px rgba(255,255,255,.35))' // keeps dark colors legible on the dark background

function gradientStyle(gradientOrColor) {
  return {
    backgroundImage: gradientOrColor.startsWith('#') ? `linear-gradient(${gradientOrColor}, ${gradientOrColor})` : gradientOrColor,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    display: 'inline-block',
    filter: GLOW,
  }
}

// Renders a team's own name per its exact color spec (word-by-word solid
// colors, a full gradient, or one flat color). When `text` overrides what's
// actually displayed (e.g. player names styled in their team's colors),
// word-splitting wouldn't make sense against unrelated text, so that case
// always falls back to a smooth gradient blend of the team's own colors
// instead — consistent and readable regardless of what text is shown.
export default function TeamName({ name, text, isWinner, className = '' }) {
  const config = TEAM_COLORS[name]
  const winnerClass = isWinner ? 'team-winner' : ''

  if (!config) {
    return <span className={className}>{text ?? name}</span>
  }

  // Showing something other than the team's own name (player names) -
  // always a smooth blend, never a literal word-split.
  if (text != null && text !== name) {
    const blend = config.type === 'words'
      ? `linear-gradient(135deg, ${config.colors[0]}, ${config.colors[1]})`
      : (config.type === 'solid' ? config.value : config.value)
    return <span className={`${className} ${winnerClass}`} style={gradientStyle(blend)}>{text}</span>
  }

  if (config.type === 'words') {
    const words = name.split(' ')
    return (
      <span className={`${className} ${winnerClass}`}>
        {words.map((w, i) => (
          <span key={i} style={gradientStyle(config.colors[i % config.colors.length])}>
            {w}{i < words.length - 1 ? '\u00A0' : ''}
          </span>
        ))}
      </span>
    )
  }

  return <span className={`${className} ${winnerClass}`} style={gradientStyle(config.value)}>{name}</span>
}
