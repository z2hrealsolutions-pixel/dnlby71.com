export function labelForType(matchTypeKey) {
  const labels = {
    mens_doubles: "Men's Doubles",
    mens_singles: "Men's Singles",
    womens_doubles: "Women's Doubles",
    womens_singles: "Women's Singles",
    mixed_doubles: 'Mixed Doubles',
    mixed_45_doubles: 'Over 40 Mixed Doubles',
  }
  return labels[matchTypeKey] || matchTypeKey
}

export const STAGE_LABELS = {
  qualifier1: 'Qualifier 1',
  eliminator: 'Eliminator',
  qualifier2: 'Qualifier 2',
  final: 'Final',
}

// Each team's own name is styled per these exact specs. 'gradient' blends
// smoothly across the whole name; 'words' colors each word of the team's
// own name solidly (Black Stingers: "Black" one color, "Stingers"
// another); 'solid' is one flat color throughout.
export const TEAM_COLORS = {
  'Fire Bees': { type: 'gradient', value: 'linear-gradient(135deg, #FF8A00, #E8202B)' },
  'Black Stingers': { type: 'words', colors: ['#15151A', '#E8202B'] },
  'Golden Stingers': { type: 'words', colors: ['#F4B93E', '#4FC3F7'] },
  'Hive Aces': { type: 'solid', value: '#A855F7' },
  'Hive Hustlers': { type: 'gradient', value: 'linear-gradient(135deg, #3DCB4A, #F0E64A)' },
  'Bumble Bees': { type: 'words', colors: ['#F4C724', '#15151A'] },
}
