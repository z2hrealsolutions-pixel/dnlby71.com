// Shared across Lineups, Standings, Knockout, and Export pages.
// slots: how many independent matches of that type exist per matchup
// (e.g. 3 separate Men's Doubles pairings), and whether it's a doubles
// (2 pts) or singles (3 pts) match for points calculation.

export const MATCH_TYPES = [
  { key: 'mens_doubles',    label: "Men's Doubles",       slots: 3, isDoubles: true,  genderReq: 'M' },
  { key: 'mens_singles',    label: "Men's Singles",       slots: 2, isDoubles: false, genderReq: 'M' },
  { key: 'womens_doubles',  label: "Women's Doubles",     slots: 1, isDoubles: true,  genderReq: 'F' },
  { key: 'womens_singles',  label: "Women's Singles",     slots: 1, isDoubles: false, genderReq: 'F' },
  { key: 'mixed_doubles',   label: 'Mixed Doubles',       slots: 1, isDoubles: true,  genderReq: null },
  { key: 'mixed_45_doubles',label: 'Over 40 Mixed Doubles', slots: 1, isDoubles: true,  genderReq: null, requires45: true },
]

export function pointsForType(matchTypeKey) {
  const t = MATCH_TYPES.find(m => m.key === matchTypeKey)
  return t?.isDoubles ? 2 : 3
}

export function labelForType(matchTypeKey) {
  return MATCH_TYPES.find(m => m.key === matchTypeKey)?.label || matchTypeKey
}

export const STAGE_LABELS = {
  group: 'Group Stage',
  qualifier1: 'Qualifier 1',
  eliminator: 'Eliminator',
  qualifier2: 'Qualifier 2',
  final: 'Final',
}

// Matches the exact naming convention confirmed for the DUPR CSV export —
// "Stage" suffix on every knockout round except the Final.
export const DUPR_STAGE_LABELS = {
  group: 'Group Stage',
  qualifier1: 'Qualifier 1 Stage',
  eliminator: 'Eliminator Stage',
  qualifier2: 'Qualifier 2 Stage',
  final: 'Final',
}
