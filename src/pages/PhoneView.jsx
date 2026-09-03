import React from 'react'
import { supabase } from '../supabaseClient'
import { useLiveData } from '../hooks/useLiveData'
import CourtPanel from '../components/CourtPanel.jsx'
import StandingsTable from '../components/StandingsTable.jsx'
import Bracket from '../components/Bracket.jsx'
import ChampionBanner from '../components/ChampionBanner.jsx'
import Logo from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'

export default function PhoneView({ onOpenMatchup }) {
  const { data: courtN } = useLiveData(
    async () => (await supabase.rpc('get_public_court_status', { p_court: 'Court N' })).data,
    ['sub_matches']
  )
  const { data: courtB } = useLiveData(
    async () => (await supabase.rpc('get_public_court_status', { p_court: 'Court B' })).data,
    ['sub_matches']
  )
  const { data: settings } = useLiveData(
    async () => (await supabase.from('app_settings').select('show_knockout_bracket, show_champion_banner').single()).data,
    ['app_settings']
  )
  const { data: standings } = useLiveData(
    async () => (await supabase.from('standings').select('*').order('league_rank')).data,
    ['sub_matches', 'matchups']
  )
  const { data: bracketMatchups } = useLiveData(
    async () => (await supabase.rpc('get_public_bracket')).data,
    ['sub_matches', 'matchups']
  )

  const showBracket = settings?.show_knockout_bracket

  if (settings?.show_champion_banner) {
    const finalMatch = bracketMatchups?.find(m => m.stage === 'final')
    const championName = finalMatch?.winner_team_id === finalMatch?.team_a_id ? finalMatch?.team_a_name
      : finalMatch?.winner_team_id === finalMatch?.team_b_id ? finalMatch?.team_b_name : null
    return <ChampionBanner teamName={championName} />
  }

  return (
    <div className="phone-shell">
      <div className="phone-header">
        <Logo height={34} />
        <div className="title">DNL LIVE</div>
      </div>

      <div className="phone-section">
        <div className="phone-section-title">{showBracket ? 'Knockout Stage' : 'League Standings'}</div>
        {showBracket ? <Bracket matchups={bracketMatchups} /> : <StandingsTable standings={standings} />}
      </div>

      <div className="phone-section phone-court-card" onClick={() => courtN?.matchup_id && onOpenMatchup(courtN.matchup_id)}>
        <div className="phone-section-title">Court N</div>
        <CourtPanel courtName="Court N" status={courtN} />
        {courtN && <div className="phone-tap-hint">Tap for full face-off breakdown</div>}
      </div>

      <div className="phone-section phone-court-card" onClick={() => courtB?.matchup_id && onOpenMatchup(courtB.matchup_id)}>
        <div className="phone-section-title">Court B</div>
        <CourtPanel courtName="Court B" status={courtB} />
        {courtB && <div className="phone-tap-hint">Tap for full face-off breakdown</div>}
      </div>

      <Footer variant="phone" />
    </div>
  )
}
