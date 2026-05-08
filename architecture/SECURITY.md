# Threat model y autenticación social

## Identidad

Keycloak gestiona usuarios, passwords, enlaces de reset de un solo uso, verificación de correo, federación social y políticas de sesión. No se replican contraseñas en Nest ni en PostgreSQL de aplicación. En producción: SMTP con TLS, `verifyEmail=true`, protección de detección de fuerza bruta, MFA para administradores y usuarios sensibles, reset expirables y políticas por tenant.

## Google / Facebook

En Keycloak Admin Console: Identity Providers → Google/Facebook. Configura Client ID y Client Secret externos de forma privada; habilita vínculo de cuentas con verificación de email y revisión de conflictos. Registra callback: `https://TU-DOMINIO-AUTH/realms/agentops/broker/google/endpoint` (y `/facebook/endpoint`). Para pruebas locales sustituye esquema/host por http://localhost:8081. Los proveedores requieren una aplicación real y aprobación según su consola; no puede automatizarse sin credenciales.

## Borde de confianza

El JWT debe tener `iss` y `aud` exactos, firma RS256/ES256 legítima de JWKS controlado, expiración y subject. La infraestructura debe asegurar que `OIDC_JWKS_URL` pertenece al Keycloak confiable, no a input de usuario. NINGÚN `organization_id` del navegador concede autorización: la DB verifica membership. Todos los endpoints privados usan AuthGuard de forma predeterminada, no por convención manual.

## Riesgos abiertos

La SPA guarda tokens en sessionStorage (XSS puede leerlos); CSP fuerte y sanitización ayudan, pero la arquitectura recomendada para producción sensible es BFF con sesión HttpOnly + CSRF. HTTPS obligatorio, CORS origen exacto, headers, rate limits reales, MFA y secreto de Keycloak admin externo son pendientes. El realm local contiene cuentas por defecto solo de configuración de administración a través de variables de entorno; NO usar tal cual en producción.

## Recuperación de password

El backend NO proporciona `/forgot-password` ni envía enlaces arbitrarios: Keycloak activa `resetPasswordAllowed` y SMTP local Mailpit. El usuario navega a login alojado por Keycloak y selecciona “Forgot Password?”. Los enlaces expiran según configuración del realm y evitan exponer la existencia de cuentas desde la aplicación.
