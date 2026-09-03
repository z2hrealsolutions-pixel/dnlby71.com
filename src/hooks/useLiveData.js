import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// Fetches once immediately, then re-fetches every time ANY row changes in
// any of the given tables. This is what makes the live sections feel
// instantly live — the moment a referee saves a score (or the admin flips
// the standings/bracket toggle), every connected screen refetches within
// a fraction of a second, no polling delay.
export function useLiveData(fetchFn, tables = ['sub_matches'], deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    const result = await fetchFn()
    setData(result)
    setLoading(false)
  }, deps)

  useEffect(() => {
    refetch()
    const channelName = 'live_' + tables.join('_') + '_' + Math.random().toString(36).slice(2)
    let channel = supabase.channel(channelName)
    tables.forEach(table => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => { refetch() })
    })
    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, deps)

  return { data, loading, refetch }
}
