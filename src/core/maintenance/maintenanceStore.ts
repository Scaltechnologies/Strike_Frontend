// Tiny hand-rolled store for maintenance-mode state — this app has no
// zustand/redux, so this mirrors the pattern already used for the axios
// refresh queue in core/api/axiosInstance.ts (module-level state + a
// subscriber list), exposed to React via useSyncExternalStore.

type Listener = () => void;

const DEFAULT_MESSAGE = "App is in maintenance, we'll be back soon.";

interface MaintenanceState {
  isMaintenance: boolean;
  message: string;
}

let state: MaintenanceState = { isMaintenance: false, message: DEFAULT_MESSAGE };
const listeners = new Set<Listener>();

export function getMaintenanceState(): MaintenanceState {
  return state;
}

export function setMaintenance(on: boolean, message?: string): void {
  state = { isMaintenance: on, message: message?.trim() || DEFAULT_MESSAGE };
  listeners.forEach((listener) => listener());
}

export function subscribeMaintenance(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
