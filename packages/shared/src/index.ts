export const environments = ['test', 'production'] as const;
export type Environment = (typeof environments)[number];
export const stage = 'architecture' as const;
export const executionEnabled = false as const;
export type WorkerKind = 'query-test' | 'query-production' | 'build';
export interface WorkerCapability {
  kind: WorkerKind;
  executionEnabled: false;
  reason: 'STAGE00_EXECUTION_DISABLED';
}
export function disabledCapability(kind: WorkerKind): WorkerCapability {
  return { kind, executionEnabled, reason: 'STAGE00_EXECUTION_DISABLED' };
}
