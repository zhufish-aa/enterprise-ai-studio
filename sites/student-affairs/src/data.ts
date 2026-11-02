import { fields, dateFields, profileFields } from '../shared/student-model';
export { fields, dateFields, profileFields };
import type { components } from '../shared/contracts';
import { RuntimeQueryError } from '@eas/platform-sdk/runtime';
import { studentCenter } from './transport';
export type S = components['schemas'];
export type Student = S['StudentRecord'];
export type Template = S['StudentTemplate'];
export type Certificate = S['StudentCertificate'];
export { studentCenter as api };
export { runtimeRequestId as requestId } from '@eas/platform-sdk/runtime';
export const idTypeOptions = [
  '大陆身份证',
  '香港居民身份证',
  '澳门居民身份证',
  '台湾居民身份证',
  '港澳来往大陆通行证',
  '台湾来往大陆通行证',
];
export function profileValue(profile: S['StudentProfile'], key: string) {
  return (profile as Record<string, string>)[key] ?? '';
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y, m, d] = value.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}
export function shortDate(v: string) {
  return new Date(v).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}
export function errorText(e: unknown) {
  return e instanceof RuntimeQueryError
    ? e.diagnostic.message +
        (e.diagnostic.details?.length
          ? '\n' +
            e.diagnostic.details
              .map((d) => (fields[d.field] ?? d.field) + '：' + d.reason)
              .join('\n')
          : '')
    : e instanceof Error
      ? e.message
      : '操作未完成，请重试。';
}
export function mask(v: string) {
  return v.length > 8 ? v.slice(0, 4) + ' ···· ' + v.slice(-4) : v;
}
export function initials(name: string) {
  return name.slice(-2);
}
export function fileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('文件读取失败，请重新选择。'));
    reader.readAsDataURL(file);
  });
}
export function downloadBase64(
  content: string,
  fileName: string,
  type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
) {
  const buffer = Uint8Array.from(atob(content), (c) => c.charCodeAt(0)),
    url = URL.createObjectURL(new Blob([buffer], { type })),
    link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvTemplate() {
  const content = '\uFEFF' + profileFields.map((k) => fields[k]).join(',') + '\r\n',
    url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })),
    link = document.createElement('a');
  link.href = url;
  link.download = '学生信息导入表.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function populated(
  student: Student | null,
  settings: S['StudentCenterSettings'],
  extra: Record<string, string>,
  issueDate: string,
) {
  const p = student?.profile;
  const data: Record<string, string> = {
    ...p,
    schoolName: p?.schoolName || settings.schoolName,
    signature: settings.signature || settings.departmentName,
    departmentName: settings.departmentName,
    academicYear: p?.academicYear || settings.academicYear,
    holidayStart: p?.holidayStart || settings.holidayStart,
    holidayEnd: p?.holidayEnd || settings.holidayEnd,
    ...extra,
    issueDate,
  };
  data['holidayRange'] =
    data['holidayStart'] && data['holidayEnd']
      ? date(data['holidayStart']) + ' 至 ' + date(data['holidayEnd'])
      : (data['holidayRange'] ?? '');
  return data;
}
