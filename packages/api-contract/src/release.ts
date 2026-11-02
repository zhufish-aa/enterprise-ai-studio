import type { CatalogPlan, components } from './index.js';
export interface ReleaseInspection {
  deploymentId: string;
  leaseToken: string;
  plans: CatalogPlan[];
}
export interface ReleaseInspectionResult {
  deploymentId: string;
  leaseToken: string;
  results: { datasetVersionId: string; relations: components['schemas']['RelationMetadata'][] }[];
}
export interface DeploymentArtifactInput {
  deploymentId: string;
  sourceDigest: string;
  manifestDigest: string;
  artifactDigest: string;
  html: string;
}
export interface DeploymentAttestation {
  profile: 'opaque-static-v1';
  deploymentId: string;
  sourceDigest: string;
  manifestDigest: string;
  artifactDigest: string;
  health: 'passed';
}
