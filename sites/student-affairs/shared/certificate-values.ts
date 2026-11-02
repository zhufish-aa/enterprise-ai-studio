export const englishDateFormats = [
  ['DD/MM/YYYY', '02/11/2026（日/月/年）'],
  ['D MMMM YYYY', '2 November 2026'],
  ['MMMM D, YYYY', 'November 2, 2026'],
  ['YYYY-MM-DD', '2026-11-02'],
] as const;
export type EnglishDateFormat = (typeof englishDateFormats)[number][0];
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const genders: Readonly<Record<string, string>> = {
  男: 'Male',
  女: 'Female',
  男性: 'Male',
  女性: 'Female',
  male: 'Male',
  female: 'Female',
};
const idTypes: Readonly<Record<string, string>> = {
  大陆身份证: 'Resident Identity Card',
  香港居民身份证: 'Hong Kong Identity Card',
  澳门居民身份证: 'Macao Resident Identity Card',
  台湾居民身份证: 'Taiwan Identity Card',
  港澳来往大陆通行证: 'Mainland Travel Permit for Hong Kong and Macao Residents',
  台湾来往大陆通行证: 'Mainland Travel Permit for Taiwan Residents',
};

export function formatChineseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}
export function formatEnglishDate(value: string, format: EnglishDateFormat = 'DD/MM/YYYY') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-');
  if (format === 'YYYY-MM-DD') return value;
  if (format === 'D MMMM YYYY') return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
  if (format === 'MMMM D, YYYY') return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
  return `${day}/${month}/${year}`;
}
export const englishDateSources: Readonly<Record<string, string>> = {
  birthDateEn: 'birthDate',
  admissionDateEn: 'admissionDate',
  graduationDateEn: 'graduationDate',
  withdrawalDateEn: 'withdrawalDate',
  expectedGraduationDateEn: 'expectedGraduationDate',
  holidayStartEn: 'holidayStart',
  holidayEndEn: 'holidayEnd',
  issueDateEn: 'issueDate',
};
export function certificateValues(
  profile: Record<string, string> | undefined,
  settings: {
    schoolName: string;
    signature: string;
    departmentName: string;
    academicYear: string;
    holidayStart: string;
    holidayEnd: string;
  },
  extra: Record<string, string>,
  issueDate: string,
  dateFormatEn: EnglishDateFormat = 'DD/MM/YYYY',
  title?: { name: string; englishName?: string },
) {
  const values: Record<string, string> = {
    ...profile,
    schoolName: profile?.schoolName || settings.schoolName,
    signature: profile?.schoolName || settings.signature || settings.departmentName,
    departmentName: settings.departmentName,
    academicYear: profile?.academicYear || settings.academicYear,
    holidayStart: profile?.holidayStart || settings.holidayStart,
    holidayEnd: profile?.holidayEnd || settings.holidayEnd,
    ...extra,
    issueDate,
    dateFormatEn,
  };
  values.genderEn = extra.genderEn ?? genders[values.gender?.toLowerCase() ?? ''] ?? '';
  values.idTypeEn = extra.idTypeEn ?? idTypes[values.idType ?? ''] ?? '';
  values.academicYearEn =
    extra.academicYearEn ?? values.academicYear?.replace(/学年度?/g, '').trim() ?? '';
  values.signatureEn = extra.signatureEn ?? values.schoolNameEn ?? '';
  if (title) {
    values.templateTitle = title.name;
    values.templateTitleEn = extra.templateTitleEn ?? title.englishName ?? '';
  }
  for (const [english, source] of Object.entries(englishDateSources))
    values[english] = formatEnglishDate(values[source] ?? '', dateFormatEn);
  if (values.holidayStart && values.holidayEnd) {
    values.holidayRange =
      formatChineseDate(values.holidayStart) + ' 至 ' + formatChineseDate(values.holidayEnd);
    values.holidayRangeEn = values.holidayStartEn + ' to ' + values.holidayEndEn;
  } else {
    values.holidayRange ??= '';
    values.holidayRangeEn = extra.holidayRangeEn ?? '';
  }
  return values;
}
