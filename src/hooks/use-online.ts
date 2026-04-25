import {useEffect, useState} from 'react'
import NetInfo from '@react-native-community/netinfo'

export const useOnline = () => {
   const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
       setIsOnline(state.isConnected && state.isInternetReachable);
    })
    
    // Check initial connectivity status
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => {
      unsubscribe();
    };
  }, []); 
  
  return isOnline;
}
