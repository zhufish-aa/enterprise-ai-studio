import { capability } from './index.js';
import { createConnector } from './catalog-server.js';
import { FileSecretProvider, VaultSecretProvider } from '@eas/database-adapters';
import { loadTls, ManagedSecrets } from '@eas/connector-transport';
import { readFile } from 'node:fs/promises';
const environment = process.env['CATALOG_WORKER_ENV'];
if (!environment) console.info(JSON.stringify(capability));
else {
  if (environment !== 'test' && environment !== 'production')
    throw new Error('INVALID_WORKER_ENVIRONMENT');
  const local =
    ['development', 'test'].includes(process.env['NODE_ENV'] ?? '') &&
    process.env['CATALOG_ALLOW_LOCAL'] === 'true';
  const key = process.env['CATALOG_WORKER_KEY'],
    api = process.env['CATALOG_API_URL'];
  if (!key || !api) throw new Error('MISSING_CONNECTOR_CONFIGURATION');
  const fallback = local
    ? new FileSecretProvider(process.env['CATALOG_SECRET_FILE'] ?? '', true)
    : process.env['VAULT_ADDR']
      ? new VaultSecretProvider(
          new URL(process.env['VAULT_ADDR']),
          process.env['VAULT_TOKEN_FILE'] ?? '',
          {
            [environment]: process.env['VAULT_SECRET_PREFIX'] ?? '',
            certificates: process.env['VAULT_CERT_PREFIX'] ?? '',
          },
        )
      : undefined;
  const directory = process.env['CATALOG_MANAGED_SECRET_DIR'],
    keyFile = process.env['CATALOG_MANAGED_SECRET_KEY_FILE'],
    managed =
      directory && keyFile ? new ManagedSecrets({ directory, keyFile }, environment) : undefined;
  if (!!directory !== !!keyFile) throw new Error('INCOMPLETE_CREDENTIAL_STORE_CONFIGURATION');
  const secrets = {
    credential: async (reference: string, requestedEnvironment: string) => {
      if (reference.startsWith('managed:')) {
        if (!managed || requestedEnvironment !== environment)
          throw new Error('CREDENTIAL_UNAVAILABLE');
        return managed.get(reference);
      }
      if (!fallback) throw new Error('CREDENTIAL_UNAVAILABLE');
      return fallback.credential(reference, requestedEnvironment);
    },
    certificate: async (reference: string) => {
      if (reference === 'configured:database-ca' && process.env['CATALOG_DATABASE_CA_FILE'])
        return readFile(process.env['CATALOG_DATABASE_CA_FILE'], 'utf8');
      if (!fallback) throw new Error('CREDENTIAL_UNAVAILABLE');
      return fallback.certificate(reference);
    },
  };
  const connector = await createConnector({
    environment,
    key,
    apiUrl: new URL(api),
    secrets,
    allowLocalHttp: local,
    allowFixture: local,
    tls: await loadTls('CATALOG_SERVER_TLS'),
    clientTls: await loadTls('CATALOG_CLIENT_TLS'),
  });
  const port = await connector.listen(
    Number(process.env['CATALOG_WORKER_PORT'] ?? 3100),
    process.env['CATALOG_WORKER_HOST'] ?? '127.0.0.1',
  );
  console.info('Catalog connector listening on port ' + port);
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void connector.close().then(() => process.exit(0));
    });
}
