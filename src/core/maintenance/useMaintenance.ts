import { useSyncExternalStore } from 'react';
import { getMaintenanceState, subscribeMaintenance } from './maintenanceStore';

export function useMaintenance() {
  return useSyncExternalStore(subscribeMaintenance, getMaintenanceState, getMaintenanceState);
}
