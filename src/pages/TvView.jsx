import React from 'react'
import { supabase } from '../supabaseClient'
import { useLiveData } from '../hooks/useLiveData'
import FullCourtPanel from '../components/FullCourtPanel.jsx'
import StandingsTable from '../components/StandingsTable.jsx'
import Bracket from '../components/Bracket.jsx'
import ChampionBanner from '../components/ChampionBanner.jsx'
import Logo from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'

export default function TvView() {
  const { data: settings } = useLiveData(
    async () => (await supabase.from('app_settings').select('show_knockout_bracket, knockout_court, show_champion_banner').single()).data,
    ['app_settings']
  )
  const showBracket = settings?.show_knockout_bracket
  const knockoutCourt = settings?.knockout_court
  const otherCourt = knockoutCourt === 'Court N' ? 'Court B' : 'Court N'
  const liveCourt = showBracket ? (knockoutCourt || null) : null

  const { data: courtN } = useLiveData(
    async () => (await supabase.rpc('get_public_court_matchup', { p_court: 'Court N' })).data,
    ['sub_matches']
  )
  const { data: courtB } = useLiveData(
    async () => (await supabase.rpc('get_public_court_matchup', { p_court: 'Court B' })).data,
    ['sub_matches']
  )
  const { data: standings } = useLiveData(
    async () => (await supabase.from('standings').select('*').order('league_rank')).data,
    ['sub_matches', 'matchups']
  )
  const { data: bracketMatchups } = useLiveData(
    async () => (await supabase.rpc('get_public_bracket')).data,
    ['sub_matches', 'matchups']
  )

  if (settings?.show_champion_banner) {
    const finalMatch = bracketMatchups?.find(m => m.stage === 'final')
    const championName = finalMatch?.winner_team_id === finalMatch?.team_a_id ? finalMatch?.team_a_name
      : finalMatch?.winner_team_id === finalMatch?.team_b_id ? finalMatch?.team_b_name : null
    return <ChampionBanner teamName={championName} />
  }

  // Knockout mode with a designated live court: two panels only - the
  // active court keeps its normal size, the bracket expands to fill
  // everything that would otherwise be the other court's column plus the
  // middle column combined.
  if (showBracket && liveCourt) {
    return (
      <div className="tv-shell">
        <div className="tv-header">
          <Logo height={56} />
          <div className="title">DNL <span className="accent">LIVE</span></div>
        </div>
        <div className="tv-columns tv-columns-knockout">
          <div className="tv-col">
            <div className="tv-col-title">{liveCourt}</div>
            <FullCourtPanel courtName={liveCourt} data={liveCourt === 'Court N' ? courtN : courtB} />
          </div>
          <div className="tv-col tv-col-wide">
            <div className="tv-col-title">Knockout Stage</div>
            <Bracket matchups={bracketMatchups} />
          </div>
        </div>
        <Footer variant="tv" />
      </div>
    )
  }

  return (
    <div className="tv-shell">
      <div className="tv-header">
        <Logo height={56} />
        <div className="title">DNL <span className="accent">LIVE</span></div>
      </div>

      <div className="tv-columns">
        <div className="tv-col">
          <div className="tv-col-title">Court N</div>
          <FullCourtPanel courtName="Court N" data={courtN} />
        </div>

        <div className="tv-col">
          <div className="tv-col-title">{showBracket ? 'Knockout Stage' : 'League Standings'}</div>
          {showBracket ? <Bracket matchups={bracketMatchups} /> : <StandingsTable standings={standings} />}
        </div>

        <div className="tv-col">
          <div className="tv-col-title">Court B</div>
          <FullCourtPanel courtName="Court B" data={courtB} />
        </div>
      </div>

      <Footer variant="tv" />
    </div>
  )
}
