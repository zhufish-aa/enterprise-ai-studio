export const certificatePresets = [
  {
    kind: 'enrollment',
    name: '在校证明',
    englishName: 'CERTIFICATE OF ENROLLMENT',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，学号{{学号}}，现为我校{{班级}}在校学生。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, holder of ID document No. {{证件号码}}, is currently enrolled in {{班级（英文）}} at {{学校名称（英文）}}, with student number {{学号}}.',
  },
  {
    kind: 'attendance',
    name: '就读证明',
    englishName: 'CERTIFICATE OF ATTENDANCE',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，在我校就读，毕业时间为{{毕业时间}}。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, holder of ID document No. {{证件号码}}, was admitted to {{学校名称（英文）}} on {{入学时间（英文）}}. The graduation date is {{毕业时间（英文）}}.',
  },
  {
    kind: 'holiday',
    name: '放假时间证明',
    englishName: 'CERTIFICATE OF SCHOOL HOLIDAYS',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，现就读于我校{{就读年级}}，目前就读学年为{{目前就读学年}}。\n\n本次放假时间为{{放假起止时间}}。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, holder of ID document No. {{证件号码}}, is currently enrolled in {{就读年级（英文）}} at {{学校名称（英文）}} for the {{目前就读学年（英文）}} academic year.\n\nThe school holiday period is {{放假起止时间（英文）}}.',
  },
  {
    kind: 'graduation',
    name: '毕业证明',
    englishName: 'CERTIFICATE OF GRADUATION',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，于{{毕业时间}}从我校毕业。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, holder of ID document No. {{证件号码}}, was admitted to {{学校名称（英文）}} on {{入学时间（英文）}} and graduated on {{毕业时间（英文）}}.',
  },
  {
    kind: 'withdrawal',
    name: '肄业证明',
    englishName: 'CERTIFICATE OF STUDY',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，于{{肄业时间}}肄业。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, holder of ID document No. {{证件号码}}, studied at {{学校名称（英文）}} from {{入学时间（英文）}} until {{肄业时间（英文）}} without completing the program.',
  },
  {
    kind: 'expected-graduation',
    name: '预计毕业证明',
    englishName: 'CERTIFICATE OF EXPECTED GRADUATION',
    body: '兹证明，{{姓名}}，学号{{学号}}，性别{{性别}}，出生日期{{出生日期}}，现为{{学校名称}}在校学生，预计于{{预计毕业时间}}毕业。\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), born on {{出生日期（英文）}}, with student number {{学号}}, is currently enrolled at {{学校名称（英文）}} and is expected to graduate on {{预计毕业时间（英文）}}.',
  },
  {
    kind: 'rail-discount',
    name: '高铁优惠证明',
    englishName: 'CERTIFICATE FOR STUDENT RAIL DISCOUNT',
    body: '兹证明，{{姓名}}，性别{{性别}}，民族{{民族}}，证件号码{{证件号码}}，于{{入学时间}}入学，现为我校在校学生。\n\n家庭详细地址：{{家庭详细地址}}\n火车票优惠乘车区间：{{火车票优惠乘车区间}}\n\n特此证明。',
    englishBody:
      'This is to certify that {{姓名（英文）}} ({{性别（英文）}}), ethnicity: {{民族（英文）}}, holder of ID document No. {{证件号码}}, was admitted to {{学校名称（英文）}} on {{入学时间（英文）}} and is currently enrolled as a student.\n\nHome address: {{家庭详细地址（英文）}}\nRail discount travel route: {{火车票优惠乘车区间（英文）}}.',
  },
] as const;
export function certificatePreset(kind: string) {
  return certificatePresets.find((preset) => preset.kind === kind) ?? certificatePresets[0];
}
