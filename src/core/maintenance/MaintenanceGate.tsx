// Checks maintenance status on launch and whenever the app returns to the
// foreground, independent of auth state (a locked-out vendor still needs to
// see *why* they're locked out). Renders MaintenanceScreen in place of
// `children` while maintenance mode is on.
//
// This is the "cold start" half of maintenance-mode gating. The other half
// is the 503 handler in core/api/axiosInstance.ts, which catches an admin
// flipping the switch mid-session.
//
// NOTE: the status URL below is provisional — this app has no central
// endpoint-constants file (see other modules/*/services/*.ts, which all
// inline paths), so it's inlined here too. Confirm the real path/response
// shape with backend, then adjust `checkStatus` if it doesn't match
// ApiResponse<{ maintenanceMode, maintenanceMessage }>.

import { useEffect } from 'react';
import { AppState } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { setMaintenance } from './maintenanceStore';
import { useMaintenance } from './useMaintenance';
import { MaintenanceScreen } from '../../components/MaintenanceScreen';
import type { ApiResponse } from '../types/api.types';

const STATUS_URL = '/api/app/status';

interface MaintenanceStatus {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

async function checkStatus(): Promise<void> {
  try {
    const res = await axiosInstance.get<ApiResponse<MaintenanceStatus> | MaintenanceStatus>(STATUS_URL);
    const body = res.data as ApiResponse<MaintenanceStatus> | MaintenanceStatus;
    const status = 'data' in body ? body.data : body;
    setMaintenance(status.maintenanceMode, status.maintenanceMessage);
  } catch {
    // Endpoint unreachable/not yet implemented — don't block the app on it.
    // Mid-session 503s are still caught by the axios response interceptor.
  }
}

interface MaintenanceGateProps {
  children: React.ReactNode;
}

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const { isMaintenance, message } = useMaintenance();

  useEffect(() => {
    void checkStatus();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkStatus();
    });
    return () => sub.remove();
  }, []);

  if (isMaintenance) {
    return <MaintenanceScreen message={message} />;
  }

  return <>{children}</>;
}
