import type { components } from '../shared/contracts.js';
type S = components['schemas'];
import { fields, dateFields } from '../shared/student-model.js';
export { fields, dateFields };
export const defaultTemplates: Pick<S['StudentTemplate'], 'kind' | 'name' | 'body'>[] = [
  {
    kind: 'enrollment',
    name: '在校证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，学号{{学号}}，现为我校{{班级}}在校学生。\n\n特此证明。',
  },
  {
    kind: 'attendance',
    name: '就读证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，在我校就读，毕业时间为{{毕业时间}}。\n\n特此证明。',
  },
  {
    kind: 'holiday',
    name: '放假时间证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，现就读于我校{{就读年级}}，目前就读学年为{{目前就读学年}}。\n\n本次放假时间为{{放假起止时间}}。\n\n特此证明。',
  },
  {
    kind: 'graduation',
    name: '毕业证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，于{{毕业时间}}从我校毕业。\n\n特此证明。',
  },
  {
    kind: 'withdrawal',
    name: '肄业证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，出生日期{{出生日期}}，证件号码{{证件号码}}，于{{入学时间}}入学，于{{肄业时间}}肄业。\n\n特此证明。',
  },
  {
    kind: 'expected-graduation',
    name: '预计毕业证明',
    body: '兹证明，{{姓名}}，学号{{学号}}，性别{{性别}}，出生日期{{出生日期}}，现为{{学校名称}}在校学生，预计于{{预计毕业时间}}毕业。\n\n特此证明。',
  },
  {
    kind: 'rail-discount',
    name: '高铁优惠证明',
    body: '兹证明，{{姓名}}，性别{{性别}}，民族{{民族}}，证件号码{{证件号码}}，于{{入学时间}}入学，现为我校在校学生。\n\n家庭详细地址：{{家庭详细地址}}\n火车票优惠乘车区间：{{火车票优惠乘车区间}}\n\n特此证明。',
  },
];
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function formatDate(value: string) {
  if (!validDate(value)) return value;
  const [y, m, d] = value.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}
