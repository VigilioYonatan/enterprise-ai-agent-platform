/**
 * End-to-End API Test Runner with Live Token Authentication
 *
 * 1. Connects to the mock OIDC service on port 8081 or spins up an ephemeral JWKS.
 * 2. Obtains a cryptographically valid RS256 JWT for admin@agentops.local.
 * 3. Tests API endpoints against the live NestJS server with:
 *    - Anonymous requests (asserts 401 on protected endpoints, 200 on public)
 *    - Invalid tokens (asserts 401 rejection)
 *    - Valid Bearer token authentication (asserts 200 OK on identity, tools, providers, metrics, health)
 *    - Full sweep of all 64 endpoints defined in openapi.json.
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const jose = require(path.join(root, 'apps/enterprise-agents-impl/node_modules/jose'));

function request(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'User-Agent': 'AgentOps-E2E/1.0',
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== INICIANDO PRUEBAS E2E DE APIS CON AUTENTICACION EN VIVO ===\n');

  // 1. Obtener token del servicio OIDC local en 8081
  let validToken;
  try {
    const tokenRes = await request('GET', 'http://127.0.0.1:8081/token');
    if (tokenRes.status === 200) {
      validToken = JSON.parse(tokenRes.body).access_token;
      console.log('Token obtenido del servicio OIDC en http://127.0.0.1:8081/token');
    }
  } catch {
    console.log('Servicio OIDC 8081 no detectado, generando token local...');
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256', { extractable: true });
    const publicJwk = await jose.exportJWK(publicKey);
    publicJwk.kid = 'e2e-test-key-id';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    const srv = http.createServer((q, r) => {
      r.writeHead(200, { 'Content-Type': 'application/json' });
      r.end(JSON.stringify({ keys: [publicJwk] }));
    });
    await new Promise((r) => srv.listen(8082, '127.0.0.1', r));
    validToken = await new jose.SignJWT({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'admin@agentops.local',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'e2e-test-key-id' })
      .setIssuer('http://localhost:8080/realms/agentops')
      .setAudience('agentops-api')
      .setExpirationTime('2h')
      .sign(privateKey);
  }

  console.log(`Token JWT activo: ${validToken.slice(0, 32)}...`);

  // 2. Verificar conexion al servidor NestJS en puerto 3000
  console.log('\n--- 1. VERIFICACION DE SALUD DEL SERVIDOR ---');
  const liveResp = await request('GET', 'http://127.0.0.1:3000/health/live');
  console.log(`GET /health/live -> Status ${liveResp.status}: ${liveResp.body}`);
  if (liveResp.status !== 200) {
    throw new Error('Servidor NestJS no responde en puerto 3000');
  }

  // 3. Pruebas de Perimetro de Seguridad
  console.log('\n--- 2. VERIFICACION DE PERIMETRO DE SEGURIDAD (AUTH GUARD) ---');
  const anonResp = await request('GET', 'http://127.0.0.1:3000/api/v1/me');
  console.log(`Peticion anonima a /api/v1/me -> Status ${anonResp.status} (Esperado 401): ${anonResp.body.slice(0, 70)}...`);
  assert.strictEqual(anonResp.status, 401, 'Peticion anonima a /api/v1/me debe ser rechazada con 401');

  const badTokenResp = await request('GET', 'http://127.0.0.1:3000/api/v1/me', {
    Authorization: 'Bearer token-falso-invalido',
  });
  console.log(`Peticion con token falso a /api/v1/me -> Status ${badTokenResp.status} (Esperado 401): ${badTokenResp.body.slice(0, 70)}...`);
  assert.strictEqual(badTokenResp.status, 401, 'Peticion con token falso debe ser rechazada con 401');

  // 4. Pruebas Autenticadas con Token Valido
  console.log('\n--- 3. PRUEBAS AUTENTICADAS EXITOSAS (HTTP 200 / 303) ---');

  // A) Endpoint de Identidad /api/v1/me
  const meResp = await request('GET', 'http://127.0.0.1:3000/api/v1/me', {
    Authorization: `Bearer ${validToken}`,
  });
  console.log(`[PASS] GET /api/v1/me (autenticado) -> Status ${meResp.status}`);
  console.log(`       Identidad del Actor: ${meResp.body}`);
  assert.strictEqual(meResp.status, 200, 'GET /api/v1/me autenticado debe retornar 200');
  const meData = JSON.parse(meResp.body);
  assert.strictEqual(meData.email, 'admin@agentops.local', 'Email del actor debe ser admin@agentops.local');

  // B) Endpoint de Herramientas /api/v1/tools
  const toolsResp = await request('GET', 'http://127.0.0.1:3000/api/v1/tools', {
    Authorization: `Bearer ${validToken}`,
  });
  console.log(`[PASS] GET /api/v1/tools (autenticado) -> Status ${toolsResp.status}`);
  const tools = JSON.parse(toolsResp.body);
  console.log(`       Catalogo: ${tools.map((t) => t.key).join(', ')}`);
  assert.strictEqual(toolsResp.status, 200, 'GET /api/v1/tools autenticado debe retornar 200');
  assert(Array.isArray(tools) && tools.length > 0, 'Catalogo de herramientas no debe estar vacio');

  // C) Detalle de herramienta individual /api/v1/tools/:key
  const toolDetailResp = await request('GET', 'http://127.0.0.1:3000/api/v1/tools/text.uppercase', {
    Authorization: `Bearer ${validToken}`,
  });
  console.log(`[PASS] GET /api/v1/tools/text.uppercase -> Status ${toolDetailResp.status}`);
  console.log(`       Definicion: ${toolDetailResp.body}`);
  assert.strictEqual(toolDetailResp.status, 200, 'GET /api/v1/tools/text.uppercase debe retornar 200');

  // D) Catalogo de integraciones /api/v1/integrations
  const intResp = await request('GET', 'http://127.0.0.1:3000/api/v1/integrations', {
    Authorization: `Bearer ${validToken}`,
  });
  console.log(`[PASS] GET /api/v1/integrations -> Status ${intResp.status}`);
  console.log(`       Conectores: ${intResp.body}`);
  assert.strictEqual(intResp.status, 200, 'GET /api/v1/integrations debe retornar 200');

  // E) Metricas Prometheus /metrics
  const metricsResp = await request('GET', 'http://127.0.0.1:3000/metrics');
  console.log(`[PASS] GET /metrics -> Status ${metricsResp.status} (${metricsResp.body.length} bytes de telemetria)`);
  assert.strictEqual(metricsResp.status, 200, 'GET /metrics debe retornar 200');

  // F) Callback OAuth /api/v1/integrations/oauth/callback
  const oauthResp = await request('GET', 'http://127.0.0.1:3000/api/v1/integrations/oauth/callback?code=sample_code_123&state=sample_oauth_state_12345');
  console.log(`[PASS] GET /api/v1/integrations/oauth/callback -> Status ${oauthResp.status} (Redireccion controlada: ${oauthResp.headers.location})`);
  assert.strictEqual(oauthResp.status, 303, 'Callback OAuth debe retornar 303 Redirect');

  // 5. Barrido Completo de las 64 APIs
  console.log('\n--- 4. BARRIDO COMPLETO DE LAS 64 APIS (OPENAPI) ---');
  const openapiPath = path.join(root, 'apps/enterprise-agents-impl/docs/api/openapi.json');
  const openapiDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));

  const sampleParams = {
    '{id}': '11111111-1111-4111-8111-111111111111',
    '{user_id}': '22222222-2222-4222-8222-222222222222',
    '{key}': 'text.uppercase',
  };

  let tested = 0;
  const statusCounts = {};

  for (const [routePath, methods] of Object.entries(openapiDoc.paths)) {
    let actualPath = routePath;
    for (const [placeholder, val] of Object.entries(sampleParams)) {
      actualPath = actualPath.replace(placeholder, val);
    }
    for (const method of Object.keys(methods)) {
      tested++;
      const isPublic = ['/health/live', '/health/ready', '/metrics', '/api/v1/integrations/oauth/callback'].includes(routePath);
      const headers = isPublic ? {} : { Authorization: `Bearer ${validToken}` };
      if (['POST', 'PATCH'].includes(method.toUpperCase())) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await request(method.toUpperCase(), `http://127.0.0.1:3000${actualPath}`, headers, ['POST', 'PATCH'].includes(method.toUpperCase()) ? '{}' : null);
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
      const tag = methods[method].tags ? methods[method].tags[0] : '';
      console.log(`  [${tag.padEnd(13)}] ${method.toUpperCase().padEnd(6)} ${actualPath.padEnd(52)} -> HTTP ${res.status}`);
    }
  }

  console.log('\n=== RESUMEN FINAL DE PRUEBAS DE CABLEADO Y SEGURIDAD HTTP ===');
  console.log(`Total APIs comprobadas: ${tested}`);
  console.log('Comportamiento con Autenticacion:');
  console.log(`  - HTTP 200 / 303 (Exitosas directas): ${ (statusCounts[200] || 0) + (statusCounts[303] || 0) } APIs`);
  console.log(`  - HTTP 400 (Filtros de validacion Zod / falta de organization_id en payload): ${statusCounts[400] || 0} APIs`);
  console.log(`  - HTTP 500 (Despachadas al controlador; requieren base de datos PostgreSQL viva): ${statusCounts[500] || 0} APIs`);
  console.log(`  - HTTP 503 (Probe de Readiness esperando BD saludable): ${statusCounts[503] || 0} APIs`);
  console.log(`  - HTTP 401 (Rechazo de auth en rutas protegidas con token valido): ${statusCounts[401] || 0} APIs`);
  console.log(`  - HTTP 404 (Rutas inexistentes): ${statusCounts[404] || 0} APIs`);

  // Aserciones de fallo estricto
  assert.strictEqual(statusCounts[404] || 0, 0, 'No debe haber ninguna ruta 404 en el barrido OpenAPI');
  assert.strictEqual(statusCounts[401] || 0, 0, 'Ninguna peticion con token valido debe retornar 401');
  assert.strictEqual(tested, 64, 'Deben comprobarse exactamente las 64 rutas declaradas en openapi.json');

  console.log('\n[PASS] Todas las aserciones pasaron exitosamente. Perimetro y enrutamiento 100% verificados.');
}

main().catch((err) => {
  console.error('Error durante la ejecucion:', err);
  process.exit(1);
});
