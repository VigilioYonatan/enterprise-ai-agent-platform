import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { clientEnv } from '../config/env.schema';

export const auth = new UserManager({
  authority: clientEnv.VITE_OIDC_AUTHORITY,
  client_id: clientEnv.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${location.origin}/auth/callback`,
  post_logout_redirect_uri: `${location.origin}/`,
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: sessionStorage }),
  automaticSilentRenew: false,
});

export async function signIn() {
  await auth.signinRedirect();
}

export async function signOut() {
  sessionStorage.removeItem('selected_org');
  await auth.signoutRedirect();
}

export async function clearStoredUser() {
  sessionStorage.removeItem('selected_org');
  await auth.removeUser();
}

export async function accessToken() {
  const u = await auth.getUser();
  return u && !u.expired ? u.access_token : null;
}
