import {useEffect, useRef, useState} from 'react'
import NetInfo from '@react-native-community/netinfo'
import {sync} from '@/database/sync'

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const wasOnline = useRef(false)
  const isSyncingRef = useRef(false) // ✅ ref so the listener always sees current value

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true

      if (online && !wasOnline.current && !isSyncingRef.current) {
        isSyncingRef.current = true
        setIsSyncing(true)
        sync()
          .catch((e) => console.warn('Sync failed:', e))
          .finally(() => {
            isSyncingRef.current = false
            setIsSyncing(false)
          })
      }

      wasOnline.current = online
      setIsOnline(online)
    })

    return () => unsub()
  }, [])

  return { isOnline, isSyncing }
}
