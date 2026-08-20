import * as React from "react";

import { repo } from "@/services/repo";

type Density = "tight" | "default" | "comfortable";

interface AppState {
  locationId: string;
  setLocationId: (v: string) => void;
  range: string;
  setRange: (v: string) => void;
  density: Density;
  setDensity: (v: Density) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  tenantId: string;
  tenantName: string;
  role: string;
  setRole: (v: string) => void;
}

const Ctx = React.createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [locationId, setLocationId] = React.useState("all");
  const [range, setRange] = React.useState("Last 30 days");
  const [density, setDensity] = React.useState<Density>("default");
  const [collapsed, setCollapsed] = React.useState(false);
  const [role, setRole] = React.useState("Super Admin");

  const value: AppState = {
    locationId,
    setLocationId,
    range,
    setRange,
    density,
    setDensity,
    collapsed,
    toggleCollapsed: () => setCollapsed((c) => !c),
    tenantId: "TEN-001",
    tenantName: "Elevate Fitness",
    role,
    setRole,
  };

  return (
    <Ctx.Provider value={value}>
      <div data-density={density === "default" ? undefined : density} className="contents">
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

/** Scope filter derived from the global header controls. */
export function useScope() {
  const { locationId, tenantId } = useApp();
  return React.useMemo(() => ({ tenantId, locationId }), [tenantId, locationId]);
}

export function useLocations() {
  return repo.locations();
}
