import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TvView from './pages/TvView.jsx'
import PhoneView from './pages/PhoneView.jsx'
import MatchupDetail from './pages/MatchupDetail.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

// A TV browser window is reliably wide (1280px+ even at modest render
// scales); phones are reliably narrow. This threshold is deliberately
// generous so a tablet in landscape still gets the richer TV layout.
function useIsTv() {
  const [isTv, setIsTv] = useState(window.innerWidth >= 900)
  useEffect(() => {
    function onResize() { setIsTv(window.innerWidth >= 900) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isTv
}

function MainView() {
  const isTv = useIsTv()
  const [detailMatchupId, setDetailMatchupId] = useState(null)

  if (detailMatchupId) {
    return <MatchupDetail matchupId={detailMatchupId} onBack={() => setDetailMatchupId(null)} />
  }

  return isTv
    ? <TvView />
    : <PhoneView onOpenMatchup={setDetailMatchupId} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  )
}
