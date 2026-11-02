import type { Sql } from '../infrastructure/database.js';
/** Releases owns revocation of runtime grants; Catalog passes version identities only. */
export class RuntimeGrantInvalidator {
  async revokeDatasetVersions(
    tx: Sql,
    organizationId: string,
    versionIds: string[],
  ): Promise<void> {
    if (versionIds.length)
      await tx.exec(
        "UPDATE runtime_grants SET status='revoked' WHERE organization_id=$1 AND dataset_version_id=ANY($2::uuid[]) AND status='active'",
        [organizationId, versionIds],
      );
  }
}
