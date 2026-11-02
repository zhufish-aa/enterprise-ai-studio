import { randomUUID } from 'node:crypto';
import type { components } from '../shared/contracts.js';
import type { Sql } from './database.js';
import { Fault } from './errors.js';
import { studentPasswordHash, type StudentActor } from './accounts.js';
import { dateFields, defaultTemplates, fields, formatDate, validDate } from './definitions.js';
import { bytes, inspectDocx, parseStudents, renderDocx, requiredFields } from './files.js';
import { documentText } from './rich-document.js';
import { importWord, exportWord, legacyDocument } from './word-documents.js';
type S = components['schemas'];

interface SettingsRow {
  school_name: string;
  department_name: string;
  signature: string;
  academic_year: string;
  holiday_start: string;
  holiday_end: string;
  revision: number;
}
interface StudentRow {
  id: string;
  profile: S['StudentProfile'];
  revision: number;
  created_at: Date;
  updated_at: Date;
}
interface TemplateRow {
  id: string;
  kind: S['StudentTemplateKind'];
  name: string;
  format: 'text' | 'docx';
  body: string;
  required_fields: string[];
  version: number;
  original_file_name: string;
  created_at: Date;
  content: Buffer | null;
  document: S['StudentRichDocument'] | null;
}
interface CertRow {
  id: string;
  number: string;
  student_id: string;
  template_id: string;
  fields: Record<string, string>;
  created_at: Date;
  created_by_name: string;
  template_name: string;
}
const studentDto = (r: StudentRow): S['StudentRecord'] => ({
  id: r.id,
  profile: r.profile,
  revision: Number(r.revision),
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});
const templateDto = (r: TemplateRow): S['StudentTemplate'] => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  format: r.format,
  body: r.body,
  document: r.document ?? null,
  requiredFields: r.required_fields,
  version: Number(r.version),
  originalFileName: r.original_file_name,
  createdAt: r.created_at.toISOString(),
});
const settingsDto = (r: SettingsRow): S['StudentCenterSettings'] => ({
  schoolName: r.school_name,
  departmentName: r.department_name,
  signature: r.signature,
  academicYear: r.academic_year,
  holidayStart: r.holiday_start,
  holidayEnd: r.holiday_end,
  revision: Number(r.revision),
});
const summary = (r: CertRow): S['StudentCertificateSummary'] => ({
  id: r.id,
  number: r.number,
  studentId: r.student_id,
  studentNumber: r.fields['studentNumber'] ?? '',
  studentName: r.fields['name'] ?? '',
  templateName: r.template_name,
  issueDate: r.fields['issueDate'] ?? '',
  createdAt: r.created_at.toISOString(),
  createdBy: r.created_by_name,
});
const certSelect =
  'SELECT c.*,t.name template_name,u.display_name created_by_name FROM student_center_certificates c JOIN student_center_template_versions t ON t.organization_id=c.organization_id AND t.app_id=c.app_id AND t.id=c.template_id JOIN student_center_accounts u ON u.organization_id=c.organization_id AND u.app_id=c.app_id AND u.id=c.created_by WHERE c.organization_id=$1 AND c.app_id=$2';
const scope = (s: { organizationId: string }, appId: string) => [s.organizationId, appId];
function need<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Fault(404, 'STUDENT_RECORD_NOT_FOUND', message);
  return value;
}
export class StudentCenterService {
  constructor(private readonly validateDocument: (value: unknown) => boolean) {}
  async authorize(tx: Sql, s: StudentActor, appId: string, versionId: string, admin = false) {
    const member = await tx.one<{ role: 'administrator' | 'staff' }>(
      'SELECT role FROM student_center_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
      [...scope(s, appId), s.userId],
    );
    if (!member)
      throw new Fault(
        403,
        'STUDENT_CENTER_ACCESS_DENIED',
        '此工作台仅对部门成员开放，请由工作台管理员添加你的账号。',
      );
    if (admin && member.role !== 'administrator')
      throw new Fault(403, 'STUDENT_CENTER_ADMIN_REQUIRED', '此操作需要工作台管理员权限。');
    return member;
  }
  async settings(tx: Sql, s: StudentActor, appId: string) {
    return settingsDto(
      need(
        await tx.one<SettingsRow>(
          'SELECT * FROM student_center_settings WHERE organization_id=$1 AND app_id=$2',
          scope(s, appId),
        ),
        '工作台尚未初始化。',
      ),
    );
  }
  async bootstrap(tx: Sql, s: StudentActor, appId: string) {
    const member = need(
      await tx.one<{ role: 'administrator' | 'staff' }>(
        'SELECT role FROM student_center_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
        [...scope(s, appId), s.userId],
      ),
      '此账号不是部门成员。',
    );
    const counts = need(
      await tx.one<{ students: number; certificates: number; todayCertificates: number }>(
        `SELECT (SELECT count(*)::int FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND NOT archived) students,(SELECT count(*)::int FROM student_center_certificates WHERE organization_id=$1 AND app_id=$2) certificates,(SELECT count(*)::int FROM student_center_certificates WHERE organization_id=$1 AND app_id=$2 AND (created_at AT TIME ZONE 'Asia/Shanghai')::date=(now() AT TIME ZONE 'Asia/Shanghai')::date) "todayCertificates"`,
        scope(s, appId),
      ),
      '无法读取工作台统计。',
    );
    const templates = await tx.all<TemplateRow>(
      'SELECT DISTINCT ON(t.kind) t.* FROM student_center_template_versions t WHERE t.organization_id=$1 AND t.app_id=$2 AND NOT EXISTS(SELECT 1 FROM student_center_template_deletions d WHERE d.organization_id=t.organization_id AND d.app_id=t.app_id AND d.kind=t.kind) ORDER BY t.kind,t.version DESC',
      scope(s, appId),
    );
    const recent = await tx.all<CertRow>(
      certSelect + ' ORDER BY c.created_at DESC,c.id DESC LIMIT 6',
      scope(s, appId),
    );
    const order = defaultTemplates.map((t) => t.kind);
    templates.sort(
      (a, b) =>
        (order.includes(a.kind) ? order.indexOf(a.kind) : 99) -
          (order.includes(b.kind) ? order.indexOf(b.kind) : 99) ||
        a.name.localeCompare(b.name, 'zh-CN'),
    );
    return {
      settings: await this.settings(tx, s, appId),
      currentUser: {
        userId: s.userId,
        name: s.displayName,
        username: s.username,
        role: member.role,
      },
      counts,
      templates: templates.map(templateDto),
      recent: recent.map(summary),
    } satisfies S['StudentCenterBootstrap'];
  }
  private profile(profile: S['StudentProfile']) {
    const copy = { ...profile };
    for (const [key, value] of Object.entries(copy)) {
      const v = value.trim();
      (copy as Record<string, string>)[key] = v;
      if (dateFields.has(key) && v && !validDate(v))
        throw new Fault(
          422,
          'STUDENT_FIELD_INVALID',
          (fields[key] ?? key) + '不是有效日期，请使用 YYYY-MM-DD。',
          [{ field: key, reason: '请填写真实、完整的日期。' }],
        );
    }
    if (!copy.studentNumber || !copy.name)
      throw new Fault(422, 'STUDENT_FIELD_INVALID', '学号和姓名不能为空。');
    return copy;
  }
  async search(tx: Sql, s: StudentActor, appId: string, b: S['StudentSearch']) {
    const page = b.page ?? 1,
      pageSize = b.pageSize ?? 12,
      values = [
        ...scope(s, appId),
        '%' + (b.keyword ?? '').trim() + '%',
        b.studentNumber?.trim() ?? '',
        b.name?.trim() ?? '',
        b.className ?? '',
        b.status ?? '',
      ];
    const where =
      " FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND NOT archived AND (student_number ILIKE $3 OR name ILIKE $3 OR profile->>'className' ILIKE $3) AND ($4='' OR student_number=$4) AND ($5='' OR name=$5) AND ($6='' OR profile->>'className'=$6) AND ($7='' OR profile->>'status'=$7)";
    const items = await tx.all<StudentRow>(
        'SELECT *' + where + ' ORDER BY updated_at DESC,id DESC LIMIT $8 OFFSET $9',
        [...values, pageSize, (page - 1) * pageSize],
      ),
      count = await tx.one<{ total: number }>('SELECT count(*)::int total' + where, values),
      classes = await tx.all<{ name: string }>(
        "SELECT DISTINCT profile->>'className' name FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND NOT archived AND coalesce(profile->>'className','')<>'' ORDER BY name",
        scope(s, appId),
      );
    return {
      items: items.map(studentDto),
      total: count?.total ?? 0,
      page,
      pageSize,
      classes: classes.map((r) => r.name),
    } satisfies S['StudentSearchResult'];
  }
  async saveStudent(tx: Sql, s: StudentActor, appId: string, b: S['StudentSave']) {
    const profile = this.profile(b.profile),
      duplicate = await tx.one<{ id: string }>(
        'SELECT id FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND student_number=$3 AND ($4::uuid IS NULL OR id<>$4)',
        [...scope(s, appId), profile.studentNumber, b.id ?? null],
      );
    if (duplicate)
      throw new Fault(
        409,
        'STUDENT_NUMBER_EXISTS',
        '该学号已存在，请在列表中编辑原记录，或通过导入更新。',
        [{ field: 'studentNumber', reason: profile.studentNumber }],
      );
    if (b.id) {
      const row = await tx.one<StudentRow>(
        'UPDATE student_center_students SET student_number=$4,name=$5,profile=$6,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND app_id=$2 AND id=$3 AND revision=$7 AND NOT archived RETURNING *',
        [
          ...scope(s, appId),
          b.id,
          profile.studentNumber,
          profile.name,
          JSON.stringify(profile),
          b.revision ?? -1,
        ],
      );
      if (!row)
        throw new Fault(
          409,
          'STUDENT_REVISION_CHANGED',
          '这条学生信息已被修改或移除，请刷新后再编辑。',
        );
      return studentDto(row);
    }
    return studentDto(
      need(
        await tx.one<StudentRow>(
          'INSERT INTO student_center_students(organization_id,app_id,student_number,name,profile) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [...scope(s, appId), profile.studentNumber, profile.name, JSON.stringify(profile)],
        ),
        '保存学生信息失败。',
      ),
    );
  }
  async archive(tx: Sql, s: StudentActor, appId: string, b: S['StudentArchive']) {
    const row = await tx.one(
      'UPDATE student_center_students SET archived=true,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND app_id=$2 AND id=$3 AND revision=$4 AND NOT archived RETURNING id',
      [...scope(s, appId), b.id, b.revision],
    );
    if (!row) throw new Fault(409, 'STUDENT_REVISION_CHANGED', '学生信息已更新，请刷新后再移除。');
    return { archived: true };
  }
  async importStudents(tx: Sql, s: StudentActor, appId: string, b: S['StudentImport']) {
    const parsed = await parseStudents(b),
      existing = new Set(
        (
          await tx.all<{ student_number: string }>(
            'SELECT student_number FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND student_number=ANY($3::text[])',
            [...scope(s, appId), parsed.profiles.map((p) => p.studentNumber)],
          )
        ).map((r) => r.student_number),
      );
    const created = parsed.profiles.filter((p) => !existing.has(p.studentNumber)).length,
      updated = b.updateExisting ? parsed.profiles.length - created : 0,
      skipped = parsed.profiles.length - created - updated;
    if (b.mode === 'commit') {
      if (parsed.issues.length)
        throw new Fault(
          422,
          'STUDENT_IMPORT_INVALID',
          '文件中还有未修正的数据，本次没有写入任何学生信息。',
          parsed.issues
            .slice(0, 8)
            .map((issue) => ({ field: '第 ' + issue.row + ' 行', reason: issue.message })),
        );
      for (const p of parsed.profiles)
        await tx.exec(
          `INSERT INTO student_center_students(organization_id,app_id,student_number,name,profile) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organization_id,app_id,student_number) ${b.updateExisting ? 'DO UPDATE SET name=EXCLUDED.name,profile=student_center_students.profile||EXCLUDED.profile,archived=false,revision=student_center_students.revision+1,updated_at=now()' : 'DO NOTHING'}`,
          [...scope(s, appId), p.studentNumber, p.name, JSON.stringify(p)],
        );
    }
    return {
      total: parsed.total,
      valid: parsed.profiles.length,
      created,
      updated,
      skipped,
      columns: parsed.columns,
      sample: parsed.profiles.slice(0, 10),
      issues: parsed.issues,
      committed: b.mode === 'commit',
    } satisfies S['StudentImportResult'];
  }
  async template(tx: Sql, s: StudentActor, appId: string, id: string) {
    return need(
      await tx.one<TemplateRow>(
        'SELECT * FROM student_center_template_versions WHERE organization_id=$1 AND app_id=$2 AND id=$3',
        [...scope(s, appId), id],
      ),
      '该模板版本不存在，请重新选择。',
    );
  }
  private async templateActive(tx: Sql, s: StudentActor, appId: string, kind: string) {
    const removed = await tx.one(
      'SELECT template_id FROM student_center_template_deletions WHERE organization_id=$1 AND app_id=$2 AND kind=$3',
      [...scope(s, appId), kind],
    );
    if (removed)
      throw new Fault(
        409,
        'STUDENT_TEMPLATE_DELETED',
        '该模板已删除，请选择其他模板。已开具的证明仍可在开具记录中查看和打印。',
      );
  }
  async deleteTemplate(tx: Sql, s: StudentActor, appId: string, b: S['StudentTemplateDelete']) {
    const row = await this.template(tx, s, appId, b.id),
      latest = await tx.one<{ id: string }>(
        'SELECT id FROM student_center_template_versions WHERE organization_id=$1 AND app_id=$2 AND kind=$3 ORDER BY version DESC LIMIT 1',
        [...scope(s, appId), row.kind],
      );
    if (latest?.id !== row.id)
      throw new Fault(409, 'STUDENT_TEMPLATE_CHANGED', '模板已更新，请刷新后删除当前版本。');
    await tx.exec(
      'INSERT INTO student_center_template_deletions(organization_id,app_id,kind,template_id,deleted_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organization_id,app_id,kind) DO NOTHING',
      [...scope(s, appId), row.kind, row.id, s.userId],
    );
    return { deleted: true } satisfies S['StudentTemplateDeleteResult'];
  }
  async saveTemplate(
    tx: Sql,
    s: StudentActor,
    appId: string,
    b: S['StudentTemplateSave'] | S['StudentTemplateUpload'],
    initial = false,
  ) {
    await this.templateActive(tx, s, appId, b.kind);
    const current = await tx.one<TemplateRow>(
      'SELECT * FROM student_center_template_versions WHERE organization_id=$1 AND app_id=$2 AND kind=$3 ORDER BY version DESC LIMIT 1',
      [...scope(s, appId), b.kind],
    );
    if (!initial && current?.id !== b.expectedId)
      throw new Fault(409, 'STUDENT_TEMPLATE_CHANGED', '模板已经更新，请刷新后再保存。');
    if (!b.name.trim()) throw new Fault(422, 'TEMPLATE_INVALID', '请填写模板名称。');
    let body: string,
      required: string[],
      content: Buffer | null = null,
      fileName = '',
      document: S['StudentRichDocument'] | null = null;
    if ('contentBase64' in b) {
      if (!/\.docx$/i.test(b.fileName))
        throw new Fault(422, 'TEMPLATE_INVALID', '请选择 Word .docx 模板。');
      content = bytes(b.contentBase64);
      const info = inspectDocx(content);
      body = info.body;
      required = info.keys;
      fileName = b.fileName;
    } else {
      document = b.document ?? null;
      body = document ? documentText(document) : b.body.trim();
      if (!body) throw new Fault(422, 'TEMPLATE_INVALID', '模板正文不能为空。');
      required = requiredFields(body);
    }
    const row = need(
      await tx.one<TemplateRow>(
        'INSERT INTO student_center_template_versions(organization_id,app_id,kind,name,format,body,required_fields,version,original_file_name,content,created_by,document) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
        [
          ...scope(s, appId),
          b.kind,
          b.name.trim(),
          content ? 'docx' : 'text',
          body,
          JSON.stringify(required),
          (current?.version ?? 0) + 1,
          fileName,
          content,
          s.userId,
          document ? JSON.stringify(document) : null,
        ],
      ),
      '模板保存失败。',
    );
    return templateDto(row);
  }
  async templateFile(tx: Sql, s: StudentActor, appId: string, id: string) {
    const row = await this.template(tx, s, appId, id);
    if (row.content)
      return { contentBase64: row.content.toString('base64'), fileName: row.original_file_name };
    return exportWord(row.document ?? legacyDocument(row.body, row.name), row.name);
  }
  async certificate(tx: Sql, s: StudentActor, appId: string, id: string) {
    const row = need(
        await tx.one<CertRow>(certSelect + ' AND c.id=$3', [...scope(s, appId), id]),
        '该开具记录不存在。',
      ),
      t = await this.template(tx, s, appId, row.template_id);
    return {
      summary: summary(row),
      template: templateDto(t),
      fields: row.fields,
      contentBase64: t.content ? renderDocx(t.content, row.fields).toString('base64') : null,
      fileName: row.number + '-' + row.fields['name'] + '-' + t.name + '.docx',
    } satisfies S['StudentCertificate'];
  }
  async createCertificate(
    tx: Sql,
    s: StudentActor,
    appId: string,
    b: S['StudentCertificateCreate'],
    preview = false,
  ) {
    if (!validDate(b.issueDate))
      throw new Fault(422, 'STUDENT_FIELD_INVALID', '请选择有效的开具日期。');
    const student = need(
        await tx.one<StudentRow>(
          'SELECT * FROM student_center_students WHERE organization_id=$1 AND app_id=$2 AND id=$3 AND NOT archived',
          [...scope(s, appId), b.studentId],
        ),
        '学生记录已移除，请重新选择学生。',
      ),
      t = await this.template(tx, s, appId, b.templateId),
      settings = await this.settings(tx, s, appId);
    await this.templateActive(tx, s, appId, t.kind);
    const data: Record<string, string> = {
      ...student.profile,
      schoolName: student.profile.schoolName || settings.schoolName,
      signature: settings.signature || settings.departmentName,
      departmentName: settings.departmentName,
      academicYear: student.profile.academicYear || settings.academicYear,
      holidayStart: student.profile.holidayStart || settings.holidayStart,
      holidayEnd: student.profile.holidayEnd || settings.holidayEnd,
    };
    for (const [key, value] of Object.entries(b.fields)) {
      if (!Object.hasOwn(fields, key) || ['issueDate', 'certificateNumber'].includes(key))
        throw new Fault(422, 'STUDENT_FIELD_INVALID', '包含未支持的证明字段。', [
          { field: key, reason: '请使用当前模板提供的字段。' },
        ]);
      if (dateFields.has(key) && value && !validDate(value))
        throw new Fault(422, 'STUDENT_FIELD_INVALID', fields[key] + '请填写有效日期。');
      data[key] = value.trim();
    }
    data['issueDate'] = b.issueDate;
    data['templateTitle'] = t.name;
    data['holidayRange'] =
      data['holidayStart'] && data['holidayEnd']
        ? formatDate(data['holidayStart']) + ' 至 ' + formatDate(data['holidayEnd'])
        : (data['holidayRange'] ?? '');
    if (preview)
      return {
        template: templateDto(t),
        fields: data,
        contentBase64: t.content ? renderDocx(t.content, data).toString('base64') : null,
        fileName: t.name + '.docx',
      } satisfies S['StudentCertificatePreview'];
    const missing = t.required_fields.filter((key) => key !== 'certificateNumber' && !data[key]);
    if (missing.length)
      throw new Fault(
        422,
        'CERTIFICATE_FIELDS_REQUIRED',
        '请补齐证明中的必要信息后生成。',
        missing.map((key) => ({ field: key, reason: (fields[key] ?? key) + '尚未填写' })),
      );
    const n = need(
        await tx.one<{ number: number }>(
          'UPDATE student_center_settings SET next_number=next_number+1 WHERE organization_id=$1 AND app_id=$2 RETURNING next_number-1 number',
          scope(s, appId),
        ),
        '无法生成证明编号。',
      ),
      number = 'SW' + b.issueDate.slice(0, 4) + String(n.number).padStart(6, '0');
    data['certificateNumber'] = number;
    if (t.content) renderDocx(t.content, data);
    const id = randomUUID();
    await tx.exec(
      'INSERT INTO student_center_certificates(id,organization_id,app_id,number,student_id,template_id,fields,issue_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        id,
        ...scope(s, appId),
        number,
        student.id,
        t.id,
        JSON.stringify(data),
        b.issueDate,
        s.userId,
      ],
    );
    return this.certificate(tx, s, appId, id);
  }
  async history(tx: Sql, s: StudentActor, appId: string, b: S['StudentCertificateSearch']) {
    const page = b.page ?? 1,
      pageSize = b.pageSize ?? 12,
      q = '%' + (b.keyword ?? '').trim() + '%',
      values = [...scope(s, appId), q],
      where =
        " AND (c.number ILIKE $3 OR c.fields->>'studentNumber' ILIKE $3 OR c.fields->>'name' ILIKE $3 OR t.name ILIKE $3)";
    const items = await tx.all<CertRow>(
        certSelect + where + ' ORDER BY c.created_at DESC,c.id DESC LIMIT $4 OFFSET $5',
        [...values, pageSize, (page - 1) * pageSize],
      ),
      count = await tx.one<{ total: number }>(
        'SELECT count(*)::int total FROM (' + certSelect + where + ') q',
        values,
      );
    return {
      items: items.map(summary),
      total: count?.total ?? 0,
      page,
      pageSize,
    } satisfies S['StudentCertificateSearchResult'];
  }
  async saveSettings(tx: Sql, s: StudentActor, appId: string, b: S['StudentCenterSettingsSave']) {
    for (const key of ['holidayStart', 'holidayEnd'] as const)
      if (b[key] && !validDate(b[key]))
        throw new Fault(422, 'STUDENT_FIELD_INVALID', '放假时间请填写有效日期。');
    const row = await tx.one<SettingsRow>(
      'UPDATE student_center_settings SET school_name=$3,department_name=$4,signature=$5,academic_year=$6,holiday_start=$7,holiday_end=$8,revision=revision+1 WHERE organization_id=$1 AND app_id=$2 AND revision=$9 RETURNING *',
      [
        ...scope(s, appId),
        b.schoolName.trim(),
        b.departmentName.trim() || '学生事务中心',
        b.signature.trim(),
        b.academicYear.trim(),
        b.holidayStart,
        b.holidayEnd,
        b.revision,
      ],
    );
    if (!row)
      throw new Fault(409, 'STUDENT_REVISION_CHANGED', '工作台设置已更新，请重新打开设置后保存。');
    return settingsDto(row);
  }
  async members(tx: Sql, s: StudentActor, appId: string) {
    const items = await tx.all<S['StudentCenterMember']>(
      'SELECT m.user_id "userId",u.display_name name,u.username,m.role FROM student_center_members m JOIN student_center_accounts u ON u.organization_id=m.organization_id AND u.app_id=m.app_id AND u.id=m.user_id WHERE m.organization_id=$1 AND m.app_id=$2 AND u.active ORDER BY m.role,u.display_name',
      scope(s, appId),
    );
    return { items } satisfies S['StudentCenterMembers'];
  }
  async saveMember(tx: Sql, s: StudentActor, appId: string, b: S['StudentCenterMemberSave']) {
    if (b.userId && b.role !== 'administrator') {
      const current = await tx.one<{ role: string }>(
        'SELECT role FROM student_center_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
        [...scope(s, appId), b.userId],
      );
      if (
        current?.role === 'administrator' &&
        !(await tx.one(
          "SELECT 1 FROM student_center_members m JOIN student_center_accounts a ON a.organization_id=m.organization_id AND a.app_id=m.app_id AND a.id=m.user_id WHERE m.organization_id=$1 AND m.app_id=$2 AND m.role='administrator' AND m.user_id<>$3 AND a.active",
          [...scope(s, appId), b.userId],
        ))
      )
        throw new Fault(409, 'STUDENT_LAST_ADMIN', '请先设置另一名管理员，再调整当前管理员。');
    }
    if (b.role === 'remove') {
      if (!b.userId) throw new Fault(422, 'STUDENT_MEMBER_INVALID', '未选择工作人员。');
      await tx.exec(
        'DELETE FROM student_center_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
        [...scope(s, appId), b.userId],
      );
      await tx.exec(
        'UPDATE student_center_accounts SET active=false WHERE organization_id=$1 AND app_id=$2 AND id=$3',
        [...scope(s, appId), b.userId],
      );
      await tx.exec(
        'UPDATE student_center_sessions SET revoked_at=now() WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
        [...scope(s, appId), b.userId],
      );
    } else {
      let id = b.userId;
      if (id) {
        const a = await tx.one(
          'SELECT id FROM student_center_accounts WHERE organization_id=$1 AND app_id=$2 AND id=$3 AND active',
          [...scope(s, appId), id],
        );
        if (!a) throw new Fault(404, 'STUDENT_MEMBER_INVALID', '该工作人员账号不存在。');
        if (b.name)
          await tx.exec(
            'UPDATE student_center_accounts SET display_name=$4 WHERE organization_id=$1 AND app_id=$2 AND id=$3',
            [...scope(s, appId), id, b.name.trim()],
          );
        if (b.password) {
          await tx.exec(
            'UPDATE student_center_accounts SET password_hash=$4 WHERE organization_id=$1 AND app_id=$2 AND id=$3',
            [...scope(s, appId), id, await studentPasswordHash(b.password)],
          );
          await tx.exec(
            'UPDATE student_center_sessions SET revoked_at=now() WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
            [...scope(s, appId), id],
          );
        }
      } else {
        if (!b.username?.trim() || !b.name?.trim() || !b.password)
          throw new Fault(422, 'STUDENT_MEMBER_INVALID', '请填写账号、姓名和初始密码。');
        id = randomUUID();
        await tx.exec(
          'INSERT INTO student_center_accounts(id,organization_id,app_id,username,display_name,password_hash) VALUES($1,$2,$3,$4,$5,$6)',
          [
            id,
            ...scope(s, appId),
            b.username.trim().toLowerCase(),
            b.name.trim(),
            await studentPasswordHash(b.password),
          ],
        );
      }
      await tx.exec(
        'INSERT INTO student_center_members(organization_id,app_id,user_id,role) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,app_id,user_id) DO UPDATE SET role=EXCLUDED.role',
        [...scope(s, appId), id, b.role],
      );
    }
    return this.members(tx, s, appId);
  }
  async execute(
    tx: Sql,
    s: StudentActor,
    appId: string,
    b: S['StudentCenterRequest'],
  ): Promise<unknown> {
    switch (b.action) {
      case 'bootstrap':
        return this.bootstrap(tx, s, appId);
      case 'students.search':
        return this.search(tx, s, appId, b.payload);
      case 'students.save':
        return this.saveStudent(tx, s, appId, b.payload);
      case 'students.archive':
        return this.archive(tx, s, appId, b.payload);
      case 'students.import':
        return this.importStudents(tx, s, appId, b.payload);
      case 'templates.delete':
        return this.deleteTemplate(tx, s, appId, b.payload);
      case 'templates.save':
        return this.saveTemplate(tx, s, appId, b.payload);
      case 'templates.upload':
        return this.saveTemplate(tx, s, appId, b.payload);
      case 'templates.import': {
        if (!/\.docx$/i.test(b.payload.fileName))
          throw new Fault(422, 'TEMPLATE_INVALID', '请选择 Word .docx 文件。');
        return importWord(
          bytes(b.payload.contentBase64),
          b.payload.fileName,
          this.validateDocument,
        );
      }
      case 'templates.export':
        return exportWord(b.payload.document, b.payload.name);
      case 'templates.file':
        return this.templateFile(tx, s, appId, b.payload.id);
      case 'certificates.preview':
        return this.createCertificate(tx, s, appId, b.payload, true);
      case 'certificates.create':
        return this.createCertificate(tx, s, appId, b.payload);
      case 'certificates.search':
        return this.history(tx, s, appId, b.payload);
      case 'certificates.get':
        return this.certificate(tx, s, appId, b.payload.id);
      case 'settings.save':
        return this.saveSettings(tx, s, appId, b.payload);
      case 'members.list':
        return this.members(tx, s, appId);
      case 'members.save':
        return this.saveMember(tx, s, appId, b.payload);
    }
  }
}
