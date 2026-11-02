import { loadTls } from '@eas/connector-transport';
import type { CatalogOptions } from './runtime.js';
import type { WorkerTarget } from './jobs.js';
export async function catalogOptionsFromEnvironment(): Promise<CatalogOptions | undefined> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) return undefined;
  const local =
    ['development', 'test'].includes(process.env['NODE_ENV'] ?? '') &&
    process.env['CATALOG_ALLOW_LOCAL'] === 'true';
  const clientTls = await loadTls('CATALOG_CLIENT_TLS'),
    apiTls = await loadTls('API_SERVER_TLS');
  const workers: CatalogOptions['workers'] = {};
  for (const environment of ['test', 'production'] as const) {
    const prefix = 'CATALOG_' + environment.toUpperCase(),
      url = process.env[prefix + '_URL'],
      key = process.env[prefix + '_KEY'];
    if (!url && !key) continue;
    if (!url || !key) throw new Error('INCOMPLETE_CONNECTOR_CONFIGURATION');
    const target: WorkerTarget = {
      url: new URL(url),
      key,
      allowLocalHttp: local && environment === 'test',
      tls: clientTls,
    };
    if (environment === 'production' && (!clientTls || !apiTls || target.url.protocol !== 'https:'))
      throw new Error('PRODUCTION_MTLS_REQUIRED');
    workers[environment] = target;
  }
  const issuer = process.env['OIDC_ISSUER'],
    audience = process.env['OIDC_AUDIENCE'],
    jwksUrl = process.env['OIDC_JWKS_URL'];
  const passwordEnabled = process.env['PLATFORM_PASSWORD_AUTH'] === 'true',
    portalOrigin = process.env['PLATFORM_PORTAL_ORIGIN'];
  if (passwordEnabled && !portalOrigin) throw new Error('PORTAL_ORIGIN_REQUIRED');
  if (!local && !passwordEnabled && (!issuer || !audience || !jwksUrl))
    throw new Error('OIDC_CONFIGURATION_REQUIRED');
  const buildUrl = process.env['BUILD_WORKER_URL'],
    buildKey = process.env['BUILD_WORKER_KEY'],
    buildTls = await loadTls('BUILD_CLIENT_TLS');
  if (!!buildUrl !== !!buildKey) throw new Error('INCOMPLETE_BUILD_CONFIGURATION');
  if (buildUrl && !local && (!buildTls || new URL(buildUrl).protocol !== 'https:'))
    throw new Error('BUILD_MTLS_REQUIRED');
  const managedSecrets: CatalogOptions['managedSecrets'] = {};
  for (const environment of ['test', 'production'] as const) {
    const prefix = 'CATALOG_' + environment.toUpperCase() + '_MANAGED_SECRET',
      directory = process.env[prefix + '_DIR'],
      keyFile = process.env[prefix + '_KEY_FILE'];
    if (!!directory !== !!keyFile) throw new Error('INCOMPLETE_CREDENTIAL_STORE_CONFIGURATION');
    if (directory && keyFile) managedSecrets[environment] = { directory, keyFile };
  }
  const previewUrl = process.env['PREVIEW_WORKER_URL'],
    previewKey = process.env['PREVIEW_WORKER_KEY'],
    previewTls = await loadTls('PREVIEW_CLIENT_TLS');
  if (!!previewUrl !== !!previewKey) throw new Error('INCOMPLETE_PREVIEW_CONFIGURATION');
  if (previewUrl && !local && (!previewTls || new URL(previewUrl).protocol !== 'https:'))
    throw new Error('PREVIEW_MTLS_REQUIRED');
  const deployUrl = process.env['DEPLOY_WORKER_URL'],
    deployKey = process.env['DEPLOY_WORKER_KEY'],
    deployTls = await loadTls('DEPLOY_CLIENT_TLS');
  if (!!deployUrl !== !!deployKey) throw new Error('INCOMPLETE_DEPLOYMENT_CONFIGURATION');
  if (deployUrl && !local && (!deployTls || new URL(deployUrl).protocol !== 'https:'))
    throw new Error('DEPLOYMENT_MTLS_REQUIRED');
  return {
    databaseUrl,
    previewWorker:
      previewUrl && previewKey
        ? { url: new URL(previewUrl), key: previewKey, tls: previewTls, allowLocalHttp: local }
        : undefined,
    managedSecrets,
    cursorKey: process.env['CATALOG_CURSOR_KEY'] ?? '',
    auth: {
      allowLocalSessions: local,
      ...(passwordEnabled
        ? {
            passwordAuth: { enabled: true, allowedOrigins: [portalOrigin!], secureCookies: !local },
          }
        : {}),
      ...(issuer && audience && jwksUrl
        ? {
            oidc: {
              issuer,
              audience,
              jwksUrl,
              humanClientIds: (process.env['OIDC_HUMAN_CLIENT_IDS'] ?? '')
                .split(',')
                .filter(Boolean),
            },
          }
        : {}),
    },
    workers,
    buildWorker:
      buildUrl && buildKey
        ? { url: new URL(buildUrl), key: buildKey, tls: buildTls, allowLocalHttp: local }
        : undefined,
    deploymentWorker:
      deployUrl && deployKey
        ? { url: new URL(deployUrl), key: deployKey, tls: deployTls, allowLocalHttp: local }
        : undefined,
    apiTls,
    log: (record) => console.info(JSON.stringify(record)),
  };
}
