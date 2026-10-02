import type { OrganizationResponseDto } from '@enterprise-agents/contracts';
import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '../services/http/api-client';
import { useAuth } from './auth-context';

export type WorkspaceContextValue = {
  org: OrganizationResponseDto | null;
  orgs: OrganizationResponseDto[];
  setOrg: (id: OrganizationResponseDto['id']) => void;
  set_organization_id: (id: OrganizationResponseDto['id']) => void;
  reload: () => void;
  loading: boolean;
  error: Error | null;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(
    () => sessionStorage.getItem('selected_org') ?? '',
  );
  const organizationsQuery = useQuery({
    queryKey: ['organizations', user?.profile.sub],
    queryFn: () => api<OrganizationResponseDto[]>('/organizations'),
    enabled: Boolean(user),
  });
  const orgs = organizationsQuery.data ?? [];
  const org =
    orgs.find((organization) => organization.id === selected) ??
    orgs[0] ??
    null;

  useEffect(() => {
    if (org && org.id !== selected) {
      setSelected(org.id);
      sessionStorage.setItem('selected_org', org.id);
    }
  }, [org, selected]);

  return (
    <WorkspaceContext.Provider
      value={{
        org,
        orgs,
        setOrg: (id) => {
          setSelected(id);
          sessionStorage.setItem('selected_org', id);
        },
        set_organization_id: (id) => {
          setSelected(id);
          sessionStorage.setItem('selected_org', id);
        },
        reload: () => {
          void organizationsQuery.refetch();
        },
        loading: organizationsQuery.isLoading,
        error: organizationsQuery.error,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw Error('Workspace provider missing');
  return context;
}
