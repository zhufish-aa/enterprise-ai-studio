import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, readdir, chmod, chown } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer, connect, type Server, type Socket } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import pg from 'pg';
import { backendCookies, browserCookie } from './cookies.js';
import type {
  SiteBuildArtifact,
  SiteScope,
  SiteDataSourceInput,
  SiteDataSource,
  SiteRuntimeStatus,
  SiteHttpInput,
  SiteHttpResult,
} from '@eas/api-contract';
const run = promisify(execFile),
  uuid = /^[a-f0-9-]{36}$/i,
  keyPattern = /^[a-z][a-z0-9_]{0,62}$/;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface SiteWorkerConfig {
  root: string;
  key: string;
  port: number;
  image: string;
  origin: string;
  encryptionKeyFile: string;
  adminDatabaseUrl: string;
  tls: { key: string; cert: string; ca: string };
}
interface SourceRecord extends SiteDataSource {
  address?: string;
  password: string;
  tls: boolean;
  phase?: 'preparing' | 'ready';
  mutationId?: string;
  mutationHash?: string;
}
interface Deployment extends SiteRuntimeStatus {
  dataSource: string;
  dataSourceRevision: number;
  sourceDigest: string;
  container: string;
  bootId: string;
}
const quote = (v: string) => '"' + v.replaceAll('"', '""') + '"';
export class SiteController {
  private readonly used = new Map<string, number>();
  private readonly pending = new Map<string, number>();
  private readonly reaper: ReturnType<typeof setInterval>;
  private readonly locks = new Map<string, Promise<unknown>>();
  private readonly proxies = new Map<
    string,
    { server: Server; port: number; gateway: string; sockets: Set<Socket> }
  >();
  private readonly bootId = randomUUID();
  constructor(private readonly config: SiteWorkerConfig) {
    this.reaper = setInterval(() => {
      void this.reap().catch(() => {});
    }, 30000);
    this.reaper.unref();
  }
  close() {
    clearInterval(this.reaper);
    for (const { server } of this.proxies.values()) server.close();
  }
  private async reap() {
    const root = this.config.root;
    for (const org of await readdir(root)) {
      if (!uuid.test(org)) continue;
      for (const appId of await readdir(join(root, org))) {
        if (!uuid.test(appId)) continue;
        const scope = { organizationId: org, appId },
          folder = this.folder(scope),
          active = await this.json<{ versionId: string }>(join(folder, 'active.json'));
        let versions: string[];
        try {
          versions = await readdir(join(folder, 'versions'));
        } catch {
          continue;
        }
        for (const versionId of versions) {
          const key = appId + ':' + versionId;
          if (
            !uuid.test(versionId) ||
            active?.versionId === versionId ||
            this.pending.get(key) ||
            (this.used.get(key) ?? 0) > Date.now() - 120000
          )
            continue;
          const path = join(folder, 'versions', versionId, 'state.json'),
            state = await this.json<Deployment>(path);
          if (state?.status !== 'ready') continue;
          await this.docker(['stop', '--time', '5', state.container]).catch(() => {});
          state.status = 'stopped';
          await this.save(path, state);
        }
      }
    }
  }
  private scope(value: unknown): SiteScope {
    const b = value as Partial<SiteScope>;
    if (!b || !uuid.test(b.appId ?? '') || !uuid.test(b.organizationId ?? ''))
      throw Error('SITE_SCOPE_REQUIRED');
    return b as SiteScope;
  }
  private folder(s: SiteScope) {
    return join(this.config.root, s.organizationId, s.appId);
  }
  private async exclusive<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(name) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(fn);
    this.locks.set(name, current);
    try {
      return await current;
    } finally {
      if (this.locks.get(name) === current) this.locks.delete(name);
    }
  }
  private async json<T>(path: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw e;
    }
  }
  private async save(path: string, value: unknown) {
    const temporary = path + '.' + randomUUID() + '.next';
    await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
    await rename(temporary, path);
  }
  private async sources(s: SiteScope): Promise<SourceRecord[]> {
    const path = join(this.folder(s), 'sources.enc'),
      key = await readFile(this.config.encryptionKeyFile);
    try {
      const b = await readFile(path),
        decipher = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
      decipher.setAAD(Buffer.from(s.organizationId + ':' + s.appId));
      decipher.setAuthTag(b.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString(),
      ) as SourceRecord[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw Error('SITE_SECRET_UNAVAILABLE');
    }
  }
  private async saveSources(s: SiteScope, records: SourceRecord[]) {
    await mkdir(this.folder(s), { recursive: true, mode: 0o700 });
    const key = await readFile(this.config.encryptionKeyFile),
      iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(s.organizationId + ':' + s.appId));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(records)), cipher.final()]),
      path = join(this.folder(s), 'sources.enc'),
      temp = path + '.' + randomUUID();
    await writeFile(temp, Buffer.concat([iv, cipher.getAuthTag(), ciphertext]), { mode: 0o600 });
    await rename(temp, path);
  }
  private dto(r: SourceRecord): SiteDataSource {
    const {
      password: _password,
      phase: _phase,
      mutationId: _mutationId,
      mutationHash: _mutationHash,
      address: _address,
      ...result
    } = r;
    return result;
  }
  private pool(r: SourceRecord) {
    return new pg.Pool({
      host: r.address ?? r.host,
      port: r.port,
      database: r.database,
      user: r.username,
      password: r.password,
      ssl: r.tls ? { rejectUnauthorized: true, servername: r.host } : false,
      max: 2,
      connectionTimeoutMillis: 10000,
    });
  }
  private async check(r: SourceRecord) {
    const p = this.pool(r);
    try {
      const role = (
        await p.query(
          'SELECT rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user',
        )
      ).rows[0] as Record<string, boolean>;
      if (!role || Object.values(role).some(Boolean)) throw Error('SITE_DATABASE_ROLE_UNSAFE');
      const platform = (
        await p.query(
          "SELECT to_regclass('public.personal_access_tokens') IS NOT NULL AND to_regclass('public.app_workspaces') IS NOT NULL AS control_plane",
        )
      ).rows[0];
      if (platform?.control_plane) throw Error('SITE_CONTROL_DATABASE_REJECTED');
      await p.query('SELECT 1');
    } finally {
      await p.end();
    }
  }
  private async configure(s: SiteScope, input: SiteDataSourceInput, mutationId: string) {
    if (
      !keyPattern.test(input.key) ||
      !input.name?.trim() ||
      !['managed', 'external'].includes(input.mode) ||
      !Number.isInteger(input.revision)
    )
      throw Error('SITE_DATASOURCE_INVALID');
    const records = await this.sources(s),
      previous = records.find((r) => r.key === input.key),
      mutationHash = hash(JSON.stringify(input));
    if (previous?.mutationId === mutationId) {
      if (previous.mutationHash !== mutationHash) throw Error('IDEMPOTENCY_CONFLICT');
      if (previous.phase === 'ready') return this.dto(previous);
    } else if (
      (previous && previous.revision !== input.revision) ||
      (!previous && input.revision !== 0)
    )
      throw Error('SITE_DATASOURCE_REVISION_CONFLICT');
    let next: SourceRecord;
    if (input.mode === 'managed') {
      if (previous && previous.mode !== 'managed') throw Error('SITE_DATASOURCE_MODE_CONFLICT');
      const id = 'site_' + hash(s.organizationId + ':' + s.appId + ':' + input.key).slice(0, 28),
        admin = new pg.Pool({ connectionString: this.config.adminDatabaseUrl, max: 1 });
      const adminUrl = new URL(this.config.adminDatabaseUrl);
      next = previous
        ? { ...previous, name: input.name.trim(), revision: previous.revision + 1 }
        : {
            key: input.key,
            name: input.name.trim(),
            mode: 'managed',
            engine: 'postgresql',
            environment: 'test',
            host: adminUrl.hostname,
            port: Number(adminUrl.port || 5432),
            database: id,
            username: id,
            password: randomBytes(32).toString('base64url'),
            tls: false,
            secretConfigured: true,
            revision: 1,
            phase: 'preparing',
          };
      // Persist a recoverable provisioning plan before creating the database or role.
      if (!previous) await this.saveSources(s, [...records, next]);
      try {
        const role = await admin.query('SELECT rolname FROM pg_roles WHERE rolname=$1', [id]);
        if (!role.rows.length)
          await admin.query(
            'CREATE ROLE ' +
              quote(id) +
              " LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" +
              next.password +
              "'",
          );
        const database = await admin.query(
          'SELECT pg_get_userbyid(datdba) owner FROM pg_database WHERE datname=$1',
          [id],
        );
        if (!database.rows.length)
          await admin.query('CREATE DATABASE ' + quote(id) + ' OWNER ' + quote(id));
        else if (database.rows[0].owner !== id) throw Error('SITE_DATABASE_OWNER_CONFLICT');
        await admin.query('REVOKE ALL ON DATABASE ' + quote(id) + ' FROM PUBLIC');
        await this.check(next);
        next.phase = 'ready';
      } finally {
        await admin.end();
      }
    } else {
      const addresses = (input as SiteDataSourceInput & { allowedAddresses?: string[] })
        .allowedAddresses;
      if (!addresses?.length || addresses.some((ip) => !/^\d+\.\d+\.\d+\.\d+$/.test(ip)))
        throw Error('SITE_NETWORK_POLICY_REQUIRED');
      if (
        !input.host ||
        !input.database ||
        !input.username ||
        !Number.isInteger(input.port ?? 5432) ||
        /[\s/@?#]/.test(input.host)
      )
        throw Error('SITE_DATASOURCE_INVALID');
      const password = input.password ?? (previous?.mode === 'external' ? previous.password : '');
      if (!password) throw Error('SITE_DATASOURCE_PASSWORD_REQUIRED');
      next = {
        address: addresses[0]!,
        key: input.key,
        name: input.name.trim(),
        mode: 'external',
        engine: 'postgresql',
        environment: 'test',
        host: input.host,
        port: input.port ?? 5432,
        database: input.database,
        username: input.username,
        password,
        tls: input.tls !== false,
        secretConfigured: true,
        revision: (previous?.revision ?? 0) + 1,
        phase: 'ready',
      };
      await this.check(next);
    }
    next.mutationId = mutationId;
    next.mutationHash = mutationHash;
    await this.saveSources(s, [...records.filter((r) => r.key !== next.key), next]);
    for (const [key, proxy] of this.proxies) {
      if (key.startsWith(s.organizationId + ':' + s.appId + ':' + next.key + ':')) {
        for (const socket of proxy.sockets) socket.destroy();
        proxy.server.close();
        this.proxies.delete(key);
      }
    }
    return this.dto(next);
  }
  private async inspect(s: SiteScope, key: string) {
    const source = (await this.sources(s)).find((r) => r.key === key);
    if (!source) throw Error('SITE_DATASOURCE_REQUIRED');
    await this.check(source);
    const pool = this.pool(source);
    try {
      return {
        source: this.dto(source),
        tables: (
          await pool.query(
            "SELECT table_name AS \"table\",column_name AS \"column\",data_type AS type,is_nullable='YES' AS nullable FROM information_schema.columns WHERE table_schema='public' AND table_name NOT LIKE '_eas_%' ORDER BY table_name,ordinal_position",
          )
        ).rows,
      };
    } finally {
      await pool.end();
    }
  }
  private async docker(args: string[]) {
    return (
      await run('docker', args, { timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
    ).stdout.trim();
  }
  private async network(s: SiteScope) {
    const id = hash(s.organizationId + ':' + s.appId).slice(0, 10),
      name = 'eas-site-' + id,
      bridge = 'easb' + id;
    let json: string;
    try {
      json = await this.docker(['network', 'inspect', name]);
    } catch {
      await this.docker([
        'network',
        'create',
        '--internal',
        '--opt',
        'com.docker.network.bridge.name=' + bridge,
        '--label',
        'eas.site=' + s.appId,
        name,
      ]);
      json = await this.docker(['network', 'inspect', name]);
    }
    const item = (
      JSON.parse(json) as {
        Internal: boolean;
        Labels: Record<string, string>;
        IPAM: { Config: { Gateway: string }[] };
      }[]
    )[0];
    if (!item?.Internal || item.Labels['eas.site'] !== s.appId)
      throw Error('SITE_NETWORK_REJECTED');
    return { name, bridge, gateway: item.IPAM.Config[0]!.Gateway };
  }
  private async databaseProxy(s: SiteScope, r: SourceRecord) {
    const id = s.organizationId + ':' + s.appId + ':' + r.key + ':' + r.revision,
      existing = this.proxies.get(id);
    if (existing) return existing;
    const network = await this.network(s);
    const sockets = new Set<Socket>();
    const server = createServer((client) => {
      sockets.add(client);
      client.once('close', () => sockets.delete(client));
      let buffer = Buffer.alloc(0),
        started = false;
      const fail = () => client.destroy();
      client.on('error', () => {});
      client.setTimeout(15000, fail);
      const receive = (part: Buffer) => {
        buffer = Buffer.concat([buffer, part]);
        if (buffer.length < 8) return;
        const length = buffer.readInt32BE();
        if (length < 8 || length > 65536) {
          fail();
          return;
        }
        if (buffer.length < length) return;
        if (buffer.readInt32BE(4) === 80877103) {
          client.write('N');
          buffer = buffer.subarray(length);
          return;
        }
        if (started || buffer.readInt32BE(4) !== 196608) {
          fail();
          return;
        }
        const items = buffer.subarray(8, length).toString().split('\0'),
          params: Record<string, string> = {};
        for (let i = 0; i + 1 < items.length; i += 2) params[items[i]!] = items[i + 1]!;
        if (
          params['user'] !== r.username ||
          (params['database'] ?? params['user']) !== r.database
        ) {
          fail();
          return;
        }
        started = true;
        client.off('data', receive);
        client.setTimeout(0);
        const connectUpstream = (upstream: Socket) => {
          upstream.on('error', fail);
          client.on('close', () => upstream.destroy());
          const begin = () => {
            upstream.write(buffer);
            client.pipe(upstream);
            upstream.pipe(client);
          };
          if (r.tls) {
            const ssl = Buffer.alloc(8);
            ssl.writeInt32BE(8);
            ssl.writeInt32BE(80877103, 4);
            upstream.write(ssl);
            upstream.once('data', (response) => {
              if (response.toString() !== 'S') {
                fail();
                upstream.destroy();
                return;
              }
              const secure = tlsConnect(
                { socket: upstream, servername: r.host, rejectUnauthorized: true },
                () => {
                  secure.write(buffer);
                  client.pipe(secure);
                  secure.pipe(client);
                },
              );
              secure.on('error', fail);
              client.on('close', () => secure.destroy());
            });
          } else begin();
        };
        const upstream = connect({ host: r.address ?? r.host, port: r.port }, () =>
          connectUpstream(upstream),
        );
        upstream.on('error', fail);
      };
      client.on('data', receive);
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, network.gateway, resolve);
    });
    const port = (server.address() as import('node:net').AddressInfo).port;
    // Only this site's database proxy is reachable on the Docker host; other host services remain inaccessible.
    const chain = 'EAS' + hash(s.organizationId + ':' + s.appId).slice(0, 12);
    await run('iptables', ['-N', chain]).catch(() => {});
    await run('iptables', [
      '-C',
      chain,
      '-m',
      'conntrack',
      '--ctstate',
      'ESTABLISHED,RELATED',
      '-j',
      'ACCEPT',
    ]).catch(() =>
      run('iptables', [
        '-I',
        chain,
        '1',
        '-m',
        'conntrack',
        '--ctstate',
        'ESTABLISHED,RELATED',
        '-j',
        'ACCEPT',
      ]),
    );
    await run('iptables', ['-C', 'INPUT', '-i', network.bridge, '-j', chain]).catch(() =>
      run('iptables', ['-I', 'INPUT', '1', '-i', network.bridge, '-j', chain]),
    );
    await run('iptables', ['-C', chain, '-j', 'DROP']).catch(() =>
      run('iptables', ['-A', chain, '-j', 'DROP']),
    );
    await run('iptables', ['-I', chain, '1', '-p', 'tcp', '--dport', String(port), '-j', 'ACCEPT']);
    const result = { server, port, gateway: network.gateway, sockets };
    this.proxies.set(id, result);
    return result;
  }
  private async migrations(r: SourceRecord, artifact: SiteBuildArtifact) {
    const pool = this.pool(r),
      client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('eas-site-migrations'))");
      await client.query(
        'CREATE TABLE IF NOT EXISTS _eas_migrations(path text PRIMARY KEY,digest text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
      );
      for (const m of artifact.migrations) {
        if (!/^db\/[a-zA-Z0-9_/-]+\.sql$/.test(m.path) || hash(m.content) !== m.digest)
          throw Error('SITE_MIGRATION_DIGEST_MISMATCH');
        const old = (
          await client.query('SELECT digest FROM _eas_migrations WHERE path=$1', [m.path])
        ).rows[0];
        if (old && old.digest !== m.digest) throw Error('SITE_MIGRATION_CHANGED');
        if (!old) {
          await client.query(m.content);
          await client.query('INSERT INTO _eas_migrations(path,digest) VALUES($1,$2)', [
            m.path,
            m.digest,
          ]);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
      await pool.end();
    }
  }
  private async deploy(
    s: SiteScope,
    versionId: string,
    buildId: string,
    artifact: SiteBuildArtifact,
  ) {
    if (
      !uuid.test(versionId) ||
      !uuid.test(buildId) ||
      artifact.format !== 'site-fullstack-v1' ||
      hash(artifact.backend) !== artifact.backendDigest ||
      !keyPattern.test(artifact.dataSource)
    )
      throw Error('SITE_BUILD_DIGEST_MISMATCH');
    const sources = await this.sources(s),
      source = sources.find((r) => r.key === artifact.dataSource);
    if (!source || source.phase === 'preparing') throw Error('SITE_DATASOURCE_REQUIRED');
    const sourceDigest = hash(JSON.stringify(sources.map((r) => [r.key, r.revision]).sort()));
    const folder = join(this.folder(s), 'versions', versionId);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const previous = await this.json<Deployment>(join(folder, 'state.json'));
    if (previous && previous.backendDigest !== artifact.backendDigest)
      throw Error('SITE_VERSION_IMMUTABLE');
    if (
      previous?.status === 'ready' &&
      previous.bootId === this.bootId &&
      previous.sourceDigest === sourceDigest
    ) {
      try {
        const state = JSON.parse(await this.docker(['inspect', previous.container])) as {
          State: { Running: boolean };
        }[];
        if (state[0]?.State.Running) return previous;
      } catch {}
    }
    const container =
        'eas-app-' + hash(s.organizationId + ':' + s.appId + ':' + versionId).slice(0, 24),
      state: Deployment = {
        versionId,
        buildId,
        backendDigest: artifact.backendDigest,
        status: 'stopped',
        logs: [],
        updatedAt: new Date().toISOString(),
        dataSource: source.key,
        dataSourceRevision: source.revision,
        sourceDigest,
        container,
        bootId: this.bootId,
      };
    await this.save(join(folder, 'artifact.json'), artifact);
    try {
      await this.migrations(source, artifact);
      state.logs.push('Database migrations applied to the site-owned data source.');
      const proxy = await this.databaseProxy(s, source),
        network = await this.network(s),
        secretPath = join(this.folder(s), 'csrf.key');
      let csrfKey: string;
      try {
        csrfKey = await readFile(secretPath, 'utf8');
      } catch {
        csrfKey = randomBytes(32).toString('hex');
        await writeFile(secretPath, csrfKey, { mode: 0o600 });
      }
      const dataSources: Record<string, { databaseUrl: string }> = {};
      for (const r of sources) {
        const endpoint = await this.databaseProxy(s, r),
          url = new URL('postgresql://' + endpoint.gateway + ':' + endpoint.port);
        url.username = r.username;
        url.password = r.password;
        url.pathname = '/' + r.database;
        dataSources[r.key] = { databaseUrl: url.href };
      }
      await writeFile(join(folder, 'backend.cjs'), artifact.backend, { mode: 0o644 });
      await writeFile(
        join(folder, 'runtime.json'),
        JSON.stringify({
          organizationId: s.organizationId,
          appId: s.appId,
          versionId,
          databaseUrl: dataSources[source.key]!.databaseUrl,
          dataSources,
          csrfKey,
          origin: this.config.origin,
          port: 8080,
        }),
        { mode: 0o400 },
      );
      await chown(join(folder, 'runtime.json'), 10001, 10001);
      await chmod(folder, 0o755);
      await this.docker(['rm', '-f', container]).catch(() => {});
      await this.docker([
        'run',
        '-d',
        '--name',
        container,
        '--read-only',
        '--user',
        '10001:10001',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges:true',
        '--network',
        network.name,
        '--mount',
        'type=bind,src=' + folder + ',dst=/app,readonly',
        '--tmpfs',
        '/tmp:rw,noexec,nosuid,size=67108864',
        '--workdir',
        '/app',
        '--env',
        'NODE_PATH=/runtime/node_modules',
        '--env',
        'NODE_ENV=production',
        '--label',
        'eas.site=' + s.appId,
        '--label',
        'eas.version=' + versionId,
        '--log-opt',
        'max-size=5m',
        '--log-opt',
        'max-file=2',
        this.config.image,
        '/opt/node24/bin/node',
        '/app/backend.cjs',
      ]);
      let ready = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          const address = await this.address(container),
            response = await fetch('http://' + address + ':8080/healthz', {
              signal: AbortSignal.timeout(1500),
              redirect: 'manual',
            });
          if (response.ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!ready) throw Error('SITE_HEALTH_CHECK_FAILED');
      state.status = 'ready';
      state.logs.push('Isolated Node.js backend is ready; platform credentials are not mounted.');
    } catch (e) {
      state.status = 'failed';
      state.logs.push(
        e instanceof Error && /^[A-Z_]+$/.test(e.message) ? e.message : 'SITE_DEPLOYMENT_FAILED',
      );
    }
    state.updatedAt = new Date().toISOString();
    this.used.set(s.appId + ':' + versionId, Date.now());
    await this.save(join(folder, 'state.json'), state);
    return state;
  }
  private async address(container: string) {
    const json = JSON.parse(await this.docker(['inspect', container])) as {
      State: { Running: boolean };
      NetworkSettings: { Networks: Record<string, { IPAddress: string }> };
    }[];
    const value = json[0];
    if (!value?.State.Running) throw Error('SITE_BACKEND_STOPPED');
    const ip = Object.values(value.NetworkSettings.Networks)[0]?.IPAddress;
    if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip)) throw Error('SITE_BACKEND_STOPPED');
    return ip;
  }
  private async statuses(s: SiteScope) {
    const folder = join(this.folder(s), 'versions');
    let paths: string[];
    try {
      paths = await readdir(folder);
    } catch {
      return [];
    }
    const results: SiteRuntimeStatus[] = [];
    for (const id of paths) {
      if (!uuid.test(id)) continue;
      const state = await this.json<Deployment>(join(folder, id, 'state.json'));
      if (!state) continue;
      const source = (await this.sources(s)).find((r) => r.key === state.dataSource);
      let logs = state.logs;
      try {
        const output = await run('docker', ['logs', '--tail', '100', state.container], {
          timeout: 10000,
          maxBuffer: 2 * 1024 * 1024,
        });
        const raw = output.stdout + '\n' + output.stderr;
        logs = [...logs, ...raw.split('\n').filter(Boolean)];
      } catch {}
      if (state.status === 'ready') {
        try {
          await this.address(state.container);
        } catch {
          state.status = 'stopped';
        }
      }
      if (source)
        logs = logs.map((line) =>
          line
            .replaceAll(source.password, '[redacted]')
            .replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database connection]'),
        );
      results.push({
        versionId: id,
        buildId: state.buildId,
        backendDigest: state.backendDigest,
        status: state.status,
        logs,
        updatedAt: state.updatedAt,
      });
    }
    return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  private async request(
    s: SiteScope,
    versionId: string,
    input: SiteHttpInput,
  ): Promise<SiteHttpResult> {
    if (
      !uuid.test(versionId) ||
      !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(input.method) ||
      !/^\/(?!\/)[^\r\n\\]*$/.test(input.path)
    )
      throw Error('SITE_REQUEST_INVALID');
    const folder = join(this.folder(s), 'versions', versionId),
      state = await this.json<Deployment>(join(folder, 'state.json')),
      artifact = await this.json<SiteBuildArtifact>(join(folder, 'artifact.json'));
    if (!state || !artifact) throw Error('SITE_BACKEND_NOT_DEPLOYED');
    const ready = await this.exclusive(s.appId + ':deploy:' + versionId, () =>
      this.deploy(s, versionId, state.buildId, artifact),
    );
    if (ready.status !== 'ready') throw Error('SITE_BACKEND_UNAVAILABLE');
    const address = await this.address(ready.container),
      headers: Record<string, string> = {
        'content-type': 'application/json',
      };
    for (const [name, value] of Object.entries(input.headers)) {
      const key = name.toLowerCase();
      if (
        !/^[a-z0-9-]+$/.test(key) ||
        [
          'host',
          'cookie',
          'content-length',
          'connection',
          'transfer-encoding',
          'upgrade',
          'proxy-authorization',
        ].includes(key)
      )
        continue;
      if (typeof value === 'string' && !/[\r\n]/.test(value)) headers[key] = value;
    }
    const cookiesHeader = backendCookies(s.appId, input.headers['cookie'] ?? '');
    if (cookiesHeader) headers['cookie'] = cookiesHeader;
    const response = await fetch('http://' + address + ':8080' + input.path, {
      method: input.method,
      headers,
      ...(input.method !== 'GET' && input.body !== undefined
        ? { body: JSON.stringify(input.body) }
        : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(120000),
    });
    const output: Record<string, string | string[]> = {};
    response.headers.forEach((value, name) => {
      if (
        ![
          'set-cookie',
          'connection',
          'transfer-encoding',
          'content-length',
          'content-encoding',
        ].includes(name)
      )
        output[name] = value;
    });
    const cookies = response.headers
      .getSetCookie()
      .map((value) => browserCookie(s.appId, value))
      .filter((value): value is string => !!value);
    if (cookies.length) output['set-cookie'] = cookies;
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: response.status, headers: output, body };
  }
  async handle(path: string, body: unknown): Promise<unknown> {
    if (path === '/ping') return { ok: true, value: { ready: true } };
    const b = body as SiteScope & {
        input: SiteDataSourceInput;
        key: string;
        versionId: string;
        buildId: string;
        artifact: SiteBuildArtifact;
        request: SiteHttpInput;
      },
      s = this.scope(body);
    const operation = async () => {
      switch (path) {
        case '/sources':
          return (await this.sources(s)).map((r) => this.dto(r));
        case '/configure': {
          const mutationId = (body as { mutationId?: string }).mutationId;
          if (!mutationId || !uuid.test(mutationId)) throw Error('IDEMPOTENCY_REQUIRED');
          return this.configure(s, b.input, mutationId);
        }
        case '/inspect':
          return this.inspect(s, b.key);
        case '/deploy':
          return this.deploy(s, b.versionId, b.buildId, b.artifact);
        case '/status':
          return this.statuses(s);
        case '/promote': {
          if (!uuid.test(b.versionId)) throw Error('SITE_VERSION_REQUIRED');
          const state = await this.json<Deployment>(
            join(this.folder(s), 'versions', b.versionId, 'state.json'),
          );
          if (state?.status !== 'ready') throw Error('SITE_BACKEND_NOT_READY');
          await this.save(join(this.folder(s), 'active.json'), { versionId: b.versionId });
          return { active: true };
        }
        case '/request': {
          if ((body as { debugOrigin?: boolean }).debugOrigin === true)
            b.request.headers = { ...b.request.headers, origin: this.config.origin };
          const key = s.appId + ':' + b.versionId;
          this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
          this.used.set(key, Date.now());
          try {
            return await this.request(s, b.versionId, b.request);
          } finally {
            this.pending.set(key, Math.max(0, (this.pending.get(key) ?? 1) - 1));
            this.used.set(key, Date.now());
          }
        }
        default:
          throw Error('SITE_OPERATION_REJECTED');
      }
    };
    return {
      ok: true,
      value: await (['/configure', '/deploy'].includes(path)
        ? this.exclusive(
            path === '/deploy' ? s.appId + ':deploy:' + b.versionId : s.appId + path,
            operation,
          )
        : operation()),
    };
  }
}
