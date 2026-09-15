import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { EMPTY_DISCOVERY_FILTERS, type DiscoveryFilters } from "@/lib/discovery";

interface DiscoveryFiltersContextValue {
  filters: DiscoveryFilters;
  setFilters: (filters: DiscoveryFilters) => void;
  resetFilters: () => void;
}

const DiscoveryFiltersContext = createContext<DiscoveryFiltersContextValue | null>(null);

/**
 * Estado compartido de los filtros de Home/Discovery (PDR §17: Category,
 * Skill, Country — combinables). Vive en un provider aparte (no dentro de
 * Home) porque la pantalla de filtros (`app/discovery-filters.tsx`) es una
 * ruta distinta de expo-router sin forma de devolver un valor por
 * callback — este contexto es el canal entre ambas.
 */
export function DiscoveryFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_DISCOVERY_FILTERS);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      resetFilters: () => setFilters(EMPTY_DISCOVERY_FILTERS),
    }),
    [filters],
  );

  return <DiscoveryFiltersContext.Provider value={value}>{children}</DiscoveryFiltersContext.Provider>;
}

export function useDiscoveryFilters(): DiscoveryFiltersContextValue {
  const ctx = useContext(DiscoveryFiltersContext);
  if (!ctx) throw new Error("useDiscoveryFilters must be used within DiscoveryFiltersProvider");
  return ctx;
}
