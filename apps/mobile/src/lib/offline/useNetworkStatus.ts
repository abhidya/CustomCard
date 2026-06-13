import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable;
      setIsOffline(state.isConnected === false || reachable === false);
    });
    return unsubscribe;
  }, []);

  return { isOffline };
}
