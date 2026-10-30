const http = require('http');
const path = require('path');
const root = path.resolve(__dirname, '..');
const jose = require(path.join(root, 'apps/enterprise-agents-impl/node_modules/jose'));

async function start() {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
  const publicJwk = await jose.exportJWK(publicKey);
  publicJwk.kid = 'e2e-test-key-id';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  async function makeAccessToken(
    sub = '11111111-1111-4111-8111-111111111111',
    email = 'admin@agentops.local',
  ) {
    return new jose.SignJWT({
      sub,
      email,
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'e2e-test-key-id' })
      .setIssuer('http://localhost:8080/realms/agentops')
      .setAudience('agentops-api')
      .setExpirationTime('24h')
      .sign(privateKey);
  }

  async function makeIdToken(
    sub = '11111111-1111-4111-8111-111111111111',
    email = 'admin@agentops.local',
    name = 'Admin AgentOps',
  ) {
    return new jose.SignJWT({
      sub,
      email,
      email_verified: true,
      name,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'e2e-test-key-id' })
      .setIssuer('http://localhost:8080/realms/agentops')
      .setAudience('agentops-web')
      .setExpirationTime('24h')
      .sign(privateKey);
  }

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1:8081');
    const pathname = parsedUrl.pathname;

    // CORS headers for local browser access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // JWKS certs endpoint
    if (pathname === '/certs' || pathname.endsWith('/certs')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }

    // OpenID Configuration discovery
    if (pathname.includes('/.well-known/openid-configuration')) {
      const issuer = 'http://localhost:8080/realms/agentops';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
        token_endpoint: `${issuer}/protocol/openid-connect/token`,
        jwks_uri: `${issuer}/protocol/openid-connect/certs`,
        userinfo_endpoint: `${issuer}/protocol/openid-connect/userinfo`,
        end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256', 'plain'],
      }));
      return;
    }

    // OIDC Authorization redirect
    if (pathname.endsWith('/auth')) {
      const redirectUri = parsedUrl.searchParams.get('redirect_uri') || 'http://localhost:8080/auth/callback';
      const state = parsedUrl.searchParams.get('state') || '';
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', 'dev-auth-code-123');
      if (state) callbackUrl.searchParams.set('state', state);

      res.writeHead(302, { Location: callbackUrl.toString() });
      res.end();
      return;
    }

    // OIDC Token exchange
    if (pathname.endsWith('/token')) {
      const accessToken = await makeAccessToken();
      const idToken = await makeIdToken();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        access_token: accessToken,
        id_token: idToken,
        token_type: 'Bearer',
        expires_in: 86400,
        scope: 'openid profile email',
      }));
      return;
    }

    // OIDC Userinfo
    if (pathname.endsWith('/userinfo')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'admin@agentops.local',
        email_verified: true,
        name: 'Admin AgentOps',
      }));
      return;
    }

    // OIDC Logout
    if (pathname.endsWith('/logout')) {
      const postLogout = parsedUrl.searchParams.get('post_logout_redirect_uri') || 'http://localhost:8080/';
      res.writeHead(302, { Location: postLogout });
      res.end();
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(8081, '127.0.0.1', async () => {
    const defaultToken = await makeAccessToken();
    console.log('MOCK_OIDC_READY port=8081');
    console.log('DEFAULT_TOKEN=' + defaultToken);
  });
}

start().catch((err) => {
  console.error('Failed to start mock OIDC server:', err);
  process.exit(1);
});
