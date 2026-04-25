import { useEffect, useRef, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { sync } from '@/database/sync'

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const wasOnline = useRef(false)

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true

      // Only sync on the transition from offline → online
      if (online && !wasOnline.current && !isSyncing) {
        setIsSyncing(true)
        sync()
          .catch((e) => console.warn('Sync failed:', e))
          .finally(() => setIsSyncing(false))
      }

      wasOnline.current = online
      setIsOnline(online)
    })

    return () => unsub()
  }, [])

  return { isOnline, isSyncing }
}
