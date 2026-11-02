import { disabledCapability } from '@eas/shared';
export const capability = disabledCapability('query-test');
/** No task consumer is created until isolation and authorization are verified. */
export function assertExecutionDisabled(): never {
  throw new Error(capability.reason);
}
