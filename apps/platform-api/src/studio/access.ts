import type { Sql } from '../infrastructure/database.js';
import type { Subject } from '../identity/identity.js';
/** Public application-module authorization port, used again on worker lease and result delivery. */
export interface TestAppContext {
  appId: string;
  versionId: string;
  share?: { id: string; revision: number };
}
export interface TestAppAccessPort {
  checkTestVersion(tx: Sql, subject: Subject, context: TestAppContext): Promise<void>;
}
