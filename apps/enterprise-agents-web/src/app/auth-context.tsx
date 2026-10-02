import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'oidc-client-ts';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { auth, signIn, signOut } from '../services/auth/oidc-client';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth
      .getUser()
      .then((loadedUser) => {
        if (active)
          setUser(loadedUser && !loadedUser.expired ? loadedUser : null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const onLogin = (loadedUser: User) => setUser(loadedUser);
    const onLogout = () => {
      setUser(null);
      sessionStorage.removeItem('selected_org');
      queryClient.clear();
    };
    auth.events.addUserLoaded(onLogin);
    auth.events.addUserUnloaded(onLogout);
    return () => {
      active = false;
      auth.events.removeUserLoaded(onLogin);
      auth.events.removeUserUnloaded(onLogout);
    };
  }, [queryClient]);

  const handleLogout = async () => {
    queryClient.clear();
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login: signIn, logout: handleLogout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Auth provider missing');
  return context;
}
