"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMeuPerfil } from "@/lib/supabase/queries";
import type { Perfil, PermissionKey } from "@/types";

type PerfilContextValue = {
  perfil: Perfil | null;
  loading: boolean;
  isMaster: boolean;
  can: (key: PermissionKey) => boolean;
};

const PerfilContext = createContext<PerfilContextValue>({
  perfil: null,
  loading: true,
  isMaster: false,
  can: () => false,
});

export function PerfilProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getMeuPerfil(createClient());
        if (active) setPerfil(p);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isMaster = perfil?.role === "master";
  const can = (key: PermissionKey) => isMaster || !!perfil?.permissions?.[key];

  return (
    <PerfilContext.Provider value={{ perfil, loading, isMaster, can }}>
      {children}
    </PerfilContext.Provider>
  );
}

export const usePerfil = () => useContext(PerfilContext);
