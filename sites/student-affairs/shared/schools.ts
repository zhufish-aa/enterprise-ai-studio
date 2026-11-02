/** 深圳中学高中园的三所学校及其官方英文名。证明中英双语段落都靠这里对应。 */
export interface School {
  name: string;
  nameEn: string;
}
export const schools: School[] = [
  { name: '深圳中学科技高中', nameEn: 'Shenzhen Middle School of Technology' },
  { name: '深圳中学数理高中', nameEn: 'Shenzhen Middle School of Mathematics and Physics' },
  { name: '深圳中学实验高中', nameEn: 'Shenzhen Middle School of Experiment' },
];
export const schoolNames = schools.map((school) => school.name);
const matches: Array<[RegExp, string]> = [
  [/科技|Technology/i, 'Shenzhen Middle School of Technology'],
  [/数理|Mathematics/i, 'Shenzhen Middle School of Mathematics and Physics'],
  [/实验|Experiment/i, 'Shenzhen Middle School of Experiment'],
];
/** 中文校名（或带校名的落款）映射到官方英文名；已经是英文的保持不变。 */
export function schoolEnglishName(value: string) {
  const text = (value ?? '').trim();
  if (!text) return '';
  for (const [pattern, name] of matches) if (pattern.test(text)) return name;
  return '';
}
export function isKnownSchool(value: string) {
  const text = (value ?? '').trim();
  return !!text && schools.some((school) => school.name === text);
}
