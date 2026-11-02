/** Bilingual certificate support: decide whether a text block is English and translate its values. */
export const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
export function hasCjk(text: string) {
  return CJK.test(text);
}
/** A block is treated as English when it has Latin letters and no Chinese characters outside placeholders. */
export function isEnglishText(text: string) {
  const plain = text.replace(/\{\{[^{}]*\}\}/g, ' ');
  return /[A-Za-z]{2,}/.test(plain) && !CJK.test(plain);
}
const genderEn: Record<string, string> = {
  男: 'male',
  女: 'female',
  未说明: 'not specified',
};
const statusEn: Record<string, string> = {
  在读: 'currently enrolled',
  已毕业: 'graduated',
  肄业: 'withdrawn',
  休学: 'on leave',
};
const idTypeEn: Record<string, string> = {
  大陆身份证: 'Mainland Resident Identity Card',
  香港居民身份证: 'Hong Kong Identity Card',
  澳门居民身份证: 'Macao Identity Card',
  台湾居民身份证: 'Taiwan Resident Certificate',
  港澳来往大陆通行证: 'Mainland Travel Permit for Hong Kong and Macao Residents',
  台湾来往大陆通行证: 'Mainland Travel Permit for Taiwan Residents',
};
/** 深圳中学高中园三所学校的官方英文名，按校名关键字匹配。 */
const schoolEnglish: Array<[RegExp, string]> = [
  [/科技/, 'Shenzhen Middle School of Technology'],
  [/数理/, 'Shenzhen Middle School of Mathematics and Physics'],
  [/实验/, 'Shenzhen Middle School of Experiment'],
];
export function schoolEnglishName(value: string) {
  const text = (value ?? '').trim();
  if (!text) return '';
  if (/[A-Za-z]{3,}/.test(text)) return text;
  for (const [pattern, name] of schoolEnglish) if (pattern.test(text)) return name;
  return '';
}
const grades: Array<[RegExp, string]> = [
  [/高\s*一/, 'Grade 10'],
  [/高\s*二/, 'Grade 11'],
  [/高\s*三/, 'Grade 12'],
  [/初\s*一/, 'Grade 7'],
  [/初\s*二/, 'Grade 8'],
  [/初\s*三/, 'Grade 9'],
];
export function englishDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}
function englishClass(value: string) {
  const m = /(\d+)\s*班/.exec(value) ?? /(\d+)/.exec(value);
  return m ? 'Class ' + Number(m[1]) : value;
}
function englishGrade(value: string) {
  for (const [pattern, label] of grades) if (pattern.test(value)) return label;
  const m = /(\d+)/.exec(value);
  return m ? 'Grade ' + m[1] : value;
}
function englishAcademicYear(value: string) {
  const years = value.match(/\d{4}/g);
  if (years && years.length >= 2) return years[0] + '-' + years[1] + ' Academic Year';
  return value.replace(/学年/g, 'Academic Year').trim();
}
const dateKeys = new Set([
  'birthDate',
  'admissionDate',
  'graduationDate',
  'withdrawalDate',
  'expectedGraduationDate',
  'holidayStart',
  'holidayEnd',
  'issueDate',
]);
/** English rendering of an auto-filled field value. Explicit *_En overrides always win. */
export function englishValue(key: string, value: string, data: Record<string, string>): string {
  const text = (value ?? '').trim();
  const override = (data[key + 'En'] ?? '').trim();
  if (override) return override;
  if (!text) return '';
  switch (key) {
    case 'name':
      return (data['nameEn'] ?? '').trim() || text;
    case 'gender':
      return genderEn[text] ?? text;
    case 'status':
      return statusEn[text] ?? text;
    case 'idType':
      return idTypeEn[text] ?? text;
    case 'className':
      return englishClass(text);
    case 'grade':
      return englishGrade(text);
    case 'academicYear':
      return englishAcademicYear(text);
    case 'schoolName':
      return (data['schoolNameEn'] ?? '').trim() || schoolEnglishName(text) || text;
    case 'signature':
      return (data['signatureEn'] ?? '').trim() || schoolEnglishName(text) || text;
    case 'holidayRange': {
      const m = /^(\d{4}-\d{2}-\d{2})\s*(?:至|-|—|–)\s*(\d{4}-\d{2}-\d{2})$/.exec(text);
      if (m) return englishDate(m[1]!) + ' to ' + englishDate(m[2]!);
      return text;
    }
    default:
      return dateKeys.has(key) ? englishDate(text) : text;
  }
}
export function englishFieldText(key: string, raw: string, data: Record<string, string>) {
  return englishValue(key, raw, data);
}

/** Fill optional English defaults while keeping explicit names and translations editable. */
export function certificateEnglishDefaults(data: Record<string, string>) {
  const result = { ...data };
  for (const key of ['name', 'className', 'grade', 'schoolName', 'signature']) {
    const englishKey = key + 'En';
    if (result[englishKey]) continue;
    const value = englishValue(key, result[key] ?? '', result);
    if (!hasCjk(value)) result[englishKey] = value;
  }
  return result;
}
