import type { components } from '@eas/api-contract';
export type StudentCenterRequest = components['schemas']['StudentCenterRequest'];
export type StudentCenterResponse = components['schemas']['StudentCenterResponse'];
export type StudentCenterAction = StudentCenterRequest['action'];
type PayloadMap = { [R in StudentCenterRequest as R['action']]: R['payload'] };
type ResultMap = { [R in StudentCenterResponse as R['action']]: R['result'] };
export type StudentCenterPayload<K extends StudentCenterAction> = PayloadMap[K];
export type StudentCenterResult<K extends StudentCenterAction> = ResultMap[K];
export const studentCenterActions: readonly StudentCenterAction[] = [
  'auth.session',
  'auth.login',
  'auth.logout',
  'auth.password',
  'bootstrap',
  'students.search',
  'students.save',
  'students.archive',
  'students.import',
  'templates.save',
  'templates.upload',
  'templates.delete',
  'templates.file',
  'templates.import',
  'templates.export',
  'certificates.create',
  'certificates.search',
  'certificates.get',
  'certificates.preview',
  'settings.save',
  'members.list',
  'members.save',
];
