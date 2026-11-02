import ExcelJS from 'exceljs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { components } from '../shared/contracts.js';
import { Fault } from './errors.js';
import { dateFields, fields, formatDate, validDate } from './definitions.js';
type S = components['schemas'];
export function bytes(base64: string) {
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
    throw new Fault(400, 'STUDENT_FILE_INVALID', '文件内容不完整，请重新选择文件。');
  return Buffer.from(base64, 'base64');
}
const labelToKey = new Map(Object.entries(fields).map(([key, label]) => [label, key]));
export function requiredFields(body: string) {
  const keys = new Set<string>();
  for (const m of body.matchAll(/\{\{([^{}]+)\}\}/g)) {
    const label = m[1]!.trim(),
      key = labelToKey.get(label);
    if (!key)
      throw new Fault(422, 'TEMPLATE_FIELD_UNKNOWN', '模板中有未识别的字段。', [
        { field: label, reason: '使用编辑器中列出的字段，例如 {{姓名}}、{{学号}}。' },
      ]);
    keys.add(key);
  }
  return [...keys];
}
function docx(content: Buffer) {
  try {
    const zip = new PizZip(content);
    if (!zip.file('word/document.xml') || zip.file(/vbaProject|activeX|embeddings/i).length)
      throw new Error('invalid');
    for (const f of zip.file(/\.rels$/)) {
      if (/TargetMode\s*=\s*["']External["']/i.test(f.asText()))
        throw new Fault(
          422,
          'TEMPLATE_EXTERNAL_RESOURCE',
          'Word 模板包含外部链接或资源，请在 Word 中移除链接后上传。',
        );
    }
    return new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      paragraphLoop: false,
      linebreaks: true,
      errorLogging: false,
      parser: (tag) => ({
        get: (scope: Record<string, string>) =>
          Object.hasOwn(scope, tag.trim()) ? scope[tag.trim()] : '',
      }),
    });
  } catch (e) {
    if (e instanceof Fault) throw e;
    throw new Fault(
      422,
      'TEMPLATE_INVALID',
      '无法读取 Word 模板。请使用 .docx 文件，并检查 {{字段名}} 是否成对完整。',
    );
  }
}
export function inspectDocx(content: Buffer) {
  const d = docx(content),
    body = d.getFullText();
  if (!body.trim()) throw new Fault(422, 'TEMPLATE_INVALID', 'Word 模板没有正文。');
  const keys = requiredFields(body);
  const tags = body.match(/\{\{[^{}]*\}\}/g) ?? [];
  for (const tag of tags)
    if (!labelToKey.has(tag.slice(2, -2).trim()))
      throw new Fault(422, 'TEMPLATE_FIELD_UNKNOWN', 'Word 模板仅支持字段占位符。');
  return { body, keys };
}
export function renderDocx(content: Buffer, data: Record<string, string>) {
  const doc = docx(content),
    values: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, label] of Object.entries(fields))
    values[label] = dateFields.has(key) ? formatDate(data[key] ?? '') : (data[key] ?? '');
  try {
    doc.render(values);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  } catch {
    throw new Fault(422, 'TEMPLATE_RENDER_FAILED', 'Word 模板填充失败，请检查模板占位符。');
  }
}
function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted || value === '') quoted = !quoted;
      else value += c;
    } else if (c === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw new Fault(422, 'STUDENT_FILE_INVALID', 'CSV 文件中的引号未闭合。');
  if (value || row.length) {
    row.push(value);
    if (row.some((v) => v.trim())) rows.push(row);
  }
  return rows;
}
function cell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value))
    throw new Fault(
      422,
      'STUDENT_FILE_INVALID',
      '表格中有超过 Excel 精确位数的数值。学号或证件号码请设为文本，并核对原始号码后重新填写。',
    );
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value)
      throw new Fault(
        422,
        'STUDENT_FILE_INVALID',
        '学生信息中包含公式。请在 Excel 中粘贴为值后导入。',
      );
    if ('text' in value) return String(value.text);
    if ('richText' in value) return value.richText.map((v) => v.text).join('');
    return '';
  }
  return String(value);
}
const aliases: Record<string, string> = {
  学生姓名: 'name',
  学生学号: 'studentNumber',
  身份证号: 'idNumber',
  身份证号码: 'idNumber',
  身份证件号码: 'idNumber',
  班级名称: 'className',
  入学日期: 'admissionDate',
  毕业日期: 'graduationDate',
  预计毕业日期: 'expectedGraduationDate',
  肄业日期: 'withdrawalDate',
  年级: 'grade',
  学年: 'academicYear',
  学籍状态: 'status',
  放假开始日期: 'holidayStart',
  放假结束日期: 'holidayEnd',
  学院: 'department',
};
export async function parseStudents(input: S['StudentImport']): Promise<{
  profiles: S['StudentProfile'][];
  issues: { row: number; message: string }[];
  columns: string[];
  total: number;
}> {
  const content = bytes(input.contentBase64);
  let rows: string[][];
  try {
    if (/\.xlsx$/i.test(input.fileName)) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(content as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error();
      rows = [];
      sheet.eachRow({ includeEmpty: true }, (row) => {
        const values: string[] = [];
        for (let i = 1; i <= sheet.columnCount; i++) values.push(cell(row.getCell(i).value));
        rows.push(values);
      });
    } else if (/\.csv$/i.test(input.fileName)) {
      rows = csv(new TextDecoder('utf-8', { fatal: true }).decode(content).replace(/^\uFEFF/, ''));
    } else throw new Fault(422, 'STUDENT_FILE_INVALID', '请选择 Excel .xlsx 或 UTF-8 CSV 文件。');
  } catch (e) {
    if (e instanceof Fault) throw e;
    throw new Fault(
      422,
      'STUDENT_FILE_INVALID',
      '无法读取学生文件，请检查文件格式和编码；Excel 文件请另存为 .xlsx。',
    );
  }
  const columns = rows.shift()?.map((v) => v.trim()) ?? [],
    keys = columns.map(
      (label) =>
        labelToKey.get(label) ?? aliases[label] ?? (Object.hasOwn(fields, label) ? label : ''),
    );
  if (!keys.includes('studentNumber') || !keys.includes('name'))
    throw new Fault(422, 'STUDENT_IMPORT_COLUMNS', '表头需要包含“学号”和“姓名”两列。', [
      { field: 'file', reason: '下载页面中的导入表格，按表头填写后上传。' },
    ]);
  const profileKeys = new Set([
      'studentNumber',
      'name',
      'gender',
      'birthDate',
      'idNumber',
      'className',
      'admissionDate',
      'graduationDate',
      'withdrawalDate',
      'expectedGraduationDate',
      'grade',
      'academicYear',
      'holidayStart',
      'holidayEnd',
      'schoolName',
      'ethnicity',
      'department',
      'major',
      'status',
    ]),
    profiles: S['StudentProfile'][] = [],
    issues: { row: number; message: string }[] = [],
    seen = new Set<string>();
  rows.forEach((row, index) => {
    const p: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (profileKeys.has(key)) p[key] = row[i]?.trim() ?? '';
    });
    if (!Object.values(p).some(Boolean)) return;
    let message = '';
    if (!p['studentNumber'] || !p['name']) message = '学号和姓名不能为空';
    else if (seen.has(p['studentNumber'])) message = '文件内的学号重复，请合并后再导入';
    else {
      seen.add(p['studentNumber']);
      for (const [key, value] of Object.entries(p)) {
        if (value.length > 500) {
          message = (fields[key] ?? key) + '内容过长';
          break;
        }
        if (dateFields.has(key) && value) {
          const normalized = value
            .replace(/[年/.]/g, '-')
            .replace(/月/g, '-')
            .replace(/日/g, '')
            .replace(
              /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
              (_, y: string, m: string, d: string) =>
                `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
            );
          if (!validDate(normalized)) {
            message = (fields[key] ?? key) + '请填写有效日期（YYYY-MM-DD）';
            break;
          }
          p[key] = normalized;
        }
      }
    }
    if (message) issues.push({ row: index + 2, message });
    else profiles.push(p as S['StudentProfile']);
  });
  return {
    profiles,
    issues,
    columns,
    total: rows.filter((row) => row.some((value) => value.trim())).length,
  };
}
