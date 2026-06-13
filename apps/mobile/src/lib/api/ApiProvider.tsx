import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext, useMemo } from "react";

import { appConfig } from "../../config/env";
import { notifySessionInvalid, useAppSession } from "../auth/AuthProvider";
import { createCustomCardApi, type CustomCardApi } from "./endpoints";
import { createHttpClient } from "./httpClient";

const ApiContext = createContext<CustomCardApi | null>(null);

export function useApi(): CustomCardApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useApi must be used within ApiProvider");
  return api;
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const session = useAppSession();
  const queryClient = useQueryClient();

  const api = useMemo(() => {
    const http = createHttpClient({
      baseUrl: appConfig().apiBaseUrl,
      getToken: session.getToken,
      onUnauthorized: () => {
        // Expired/invalid session: clear cached customer data and sign out.
        queryClient.clear();
        notifySessionInvalid();
      }
    });
    return createCustomCardApi(http);
    // session.getToken identity changes with the session itself.
  }, [session.getToken, queryClient]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
