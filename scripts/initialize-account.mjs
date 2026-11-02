import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { hashPassword } from '../apps/platform-api/dist/identity/passwords.js';
export const administratorActions = [
  'release.create',
  'release.read',
  'release.approve',
  'release.deploy',
  'release.policy.manage',
  'dataset.query.production',
  'connection.test.production',
  'connection.metadata.production',
  'network.manage',
  'account.manage',
  'session.read',
  'source.read',
  'dataset.read',
  'dataset.query.test',
  'dataset.export',
  'catalog.manage',
  'connection.manage',
  'mapping.manage',
  'permission.manage',
  'connection.test.test',
  'connection.metadata.test',
  'app.create',
  'app.develop',
  'app.view',
  'report.view',
  'query.policy.manage',
  'query.diagnose',
  'query.audit.read',
];
/** Offline operator command. Never exposed as an HTTP bootstrap or public registration API. */
export async function initializeAccount(
  pool,
  {
    organizationId,
    userId,
    username,
    displayName,
    password,
    administrator = false,
    reset = false,
    mustChangePassword = true,
  },
) {
  if (!/^[a-z][a-z0-9_.-]{2,63}$/.test(username) || !displayName?.trim())
    throw new Error('INVALID_ACCOUNT');
  const passwordHash = await hashPassword(password),
    tx = await pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query('SELECT pg_advisory_xact_lock(218007)');
    if (!(await tx.query('SELECT id FROM organizations WHERE id=$1', [organizationId])).rowCount)
      throw new Error('ORGANIZATION_REQUIRED');
    const previous = (
      await tx.query('SELECT user_id FROM password_accounts WHERE username=$1', [username])
    ).rows[0];
    if (previous && !reset) throw new Error('ACCOUNT_EXISTS_USE_EXPLICIT_RESET');
    if (previous && userId && previous.user_id !== userId) throw new Error('ACCOUNT_ID_MISMATCH');
    let accountUserId = previous?.user_id ?? userId;
    if (accountUserId) {
      if (
        !(
          await tx.query(
            "SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND status='active'",
            [organizationId, accountUserId],
          )
        ).rowCount
      )
        throw new Error('EXISTING_ORGANIZATION_MEMBER_REQUIRED');
    } else {
      accountUserId = (
        await tx.query(
          "INSERT INTO users(oidc_issuer,oidc_subject,display_name,status) VALUES('password-account',gen_random_uuid()::text,$1,'active') RETURNING id",
          [displayName.trim()],
        )
      ).rows[0].id;
      await tx.query(
        "INSERT INTO organization_members(organization_id,user_id,status) VALUES($1,$2,'active')",
        [organizationId, accountUserId],
      );
    }
    await tx.query(
      'INSERT INTO password_accounts(user_id,username,password_hash,must_change_password) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,must_change_password=EXCLUDED.must_change_password,password_changed_at=now()',
      [accountUserId, username, passwordHash, mustChangePassword],
    );
    if (reset) {
      await tx.query(
        "UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND auth_method='password'",
        [accountUserId],
      );
      await tx.query(
        'UPDATE personal_access_tokens SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1',
        [accountUserId],
      );
    }
    if (administrator) {
      for (const permission of administratorActions)
        await tx.query(
          'INSERT INTO permissions(key,description) VALUES($1,$1) ON CONFLICT DO NOTHING',
          [permission],
        );
      const role = (
        await tx.query(
          "INSERT INTO roles(organization_id,key,name) VALUES($1,'platform_account_admin','平台管理员') ON CONFLICT(organization_id,key) DO UPDATE SET name=EXCLUDED.name RETURNING id",
          [organizationId],
        )
      ).rows[0];
      for (const permission of administratorActions)
        await tx.query(
          'INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [organizationId, role.id, permission],
        );
      await tx.query(
        'INSERT INTO role_bindings(organization_id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [organizationId, accountUserId, role.id],
      );
    }
    await tx.query(
      "INSERT INTO audit_logs(organization_id,actor_user_id,actor_service,action,resource_id,outcome,request_id) VALUES($1,$2,'offline-account-initializer',$3,$2,'allow',gen_random_uuid()::text)",
      [organizationId, accountUserId, reset ? 'account.operatorReset' : 'account.initialize'],
    );
    await tx.query('COMMIT');
    return { userId: accountUserId, username, organizationId, mustChangePassword };
  } catch (e) {
    await tx.query('ROLLBACK');
    throw e;
  } finally {
    tx.release();
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) throw new Error('MIGRATION_DATABASE_URL_REQUIRED');
  // Secret is supplied on stdin, never as an argv or environment variable.
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8')),
    pool = new pg.Pool({ connectionString: url });
  try {
    console.log(JSON.stringify(await initializeAccount(pool, input)));
  } catch {
    console.error('Account initialization failed; no credential printed.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
