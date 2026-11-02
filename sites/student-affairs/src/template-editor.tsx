import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { api, downloadBase64, errorText, fields, fileBase64, type Template } from './data';
import { Button, ErrorBox, Icon, Modal } from './components';
import { DocumentEditor, editorDocument } from './document-editor';
export function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [mode, setMode] = useState(template.format),
    [editor, setEditor] = useState<Editor | null>(null),
    [loaded, setLoaded] = useState<Template>(template),
    [importInfo, setImportInfo] = useState(''),
    upload = useRef<HTMLInputElement>(null);
  async function save() {
    if (!editor) return;
    setBusy(true);
    setError('');
    try {
      await api('templates.save', {
        kind: template.kind,
        name,
        body: editor.getText({ blockSeparator: '\n\n' }),
        document: editorDocument(editor),
        ...(template.id ? { expectedId: template.id } : {}),
      });
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function select(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    setImportInfo('');
    try {
      const r = await api('templates.import', {
        fileName: file.name,
        contentBase64: await fileBase64(file),
      });
      setLoaded({
        ...template,
        name: name.trim() || r.suggestedName,
        body: r.body,
        document: r.document,
        format: 'text',
        originalFileName: file.name,
      });
      if (editor && mode === 'text') editor.commands.setContent(r.document);
      setName((old) => (old.trim() ? old : r.suggestedName));
      setMode('text');
      setImportInfo(
        '已载入 ' +
          file.name +
          '，可直接编辑并插入填充字段。' +
          (r.notes.length ? '\n' + r.notes.join('\n') : ''),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      if (upload.current) upload.current.value = '';
    }
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const r =
        mode === 'text' && editor
          ? await api('templates.export', {
              name: name.trim() || '证明模板',
              document: editorDocument(editor),
            })
          : await api('templates.file', { id: template.id });
      downloadBase64(r.contentBase64, r.fileName);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function insert(fieldKey: string) {
    if (!editor) return;
    const marks = (editor.state.storedMarks ?? editor.state.selection.$from.marks()).map((mark) =>
      mark.toJSON(),
    );
    editor
      .chain()
      .focus()
      .insertContent({ type: 'templateField', attrs: { fieldKey }, marks })
      .run();
  }
  return (
    <Modal
      title={template.id ? '编辑 ' + template.name : '新建证明模板'}
      subtitle={
        template.id ? '当前 v' + template.version + ' · 保存后生成新版本' : '编辑文档内容与排版'
      }
      wide
      className={mode === 'text' ? 'document-modal' : ''}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <div className="footer-left template-file-actions">
            <Button icon="upload" disabled={busy} onClick={() => upload.current?.click()}>
              上传 Word 模板
            </Button>
            <Button
              icon="download"
              disabled={busy || (mode === 'text' && !editor)}
              onClick={() => void download()}
            >
              下载当前模板
            </Button>
          </div>
          <Button disabled={busy} onClick={onClose}>
            取消
          </Button>
          {mode === 'text' && (
            <Button variant="primary" disabled={busy || !editor} onClick={() => void save()}>
              {busy ? '正在保存…' : '保存新版本'}
            </Button>
          )}
        </>
      }
    >
      <ErrorBox error={error} />
      {importInfo && (
        <div className="template-import-info" role="status">
          <Icon name="check" size={16} />
          <span>{importInfo}</span>
        </div>
      )}
      <input
        className="hidden-file"
        ref={upload}
        type="file"
        accept=".docx"
        onChange={(e) => void select(e.target.files?.[0])}
      />
      <div className="document-template-name">
        <label>
          证明名称
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </label>
        <span>字体与段落格式随模板保存</span>
      </div>
      {mode === 'text' ? (
        <div className="template-document-layout">
          <DocumentEditor template={loaded} disabled={busy} onReady={setEditor} />
          <aside className="document-fields">
            <h3>填充字段</h3>
            <p>选中文字可替换为字段</p>
            <div>
              {Object.entries(fields).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  disabled={busy || !editor}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <small>开具时自动填入学生资料和本次填写的信息。</small>
          </aside>
        </div>
      ) : (
        <div className="word-template-notice">
          <span className="word-file-icon">
            <Icon name="certificate" size={27} />
          </span>
          <strong>{template.originalFileName}</strong>
          <p>下载原 Word 文件，或载入在线编辑器添加字段。</p>
          <Button icon="download" disabled={busy} onClick={() => void download()}>
            下载当前模板
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError('');
              void api('templates.file', { id: template.id })
                .then((r) =>
                  select(
                    new File(
                      [Uint8Array.from(atob(r.contentBase64), (c) => c.charCodeAt(0))],
                      r.fileName,
                      {
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      },
                    ),
                  ),
                )
                .catch((e) => {
                  setError(errorText(e));
                  setBusy(false);
                });
            }}
          >
            载入在线编辑器
          </Button>
        </div>
      )}
    </Modal>
  );
}
