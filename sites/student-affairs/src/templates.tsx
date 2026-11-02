import { useState } from 'react';
import { api, downloadBase64, errorText, requestId, shortDate, type Template } from './data';
import { Button, Empty, ErrorBox, Modal } from './components';
import { TemplateEditor } from './template-editor';

export function Templates({
  templates,
  onChanged,
  notify,
}: {
  templates: Template[];
  onChanged: () => void;
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<Template | null>(null),
    [downloading, setDownloading] = useState<string | null>(null),
    [deleting, setDeleting] = useState<Template | null>(null),
    [removing, setRemoving] = useState(false),
    [error, setError] = useState('');
  async function download(t: Template) {
    setDownloading(t.id);
    try {
      const r = await api('templates.file', { id: t.id });
      downloadBase64(r.contentBase64, r.fileName);
    } catch (e) {
      notify(errorText(e));
    } finally {
      setDownloading(null);
    }
  }
  async function remove() {
    if (!deleting) return;
    setRemoving(true);
    setError('');
    try {
      await api('templates.delete', { id: deleting.id });
      setDeleting(null);
      onChanged();
      notify('模板已删除');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setRemoving(false);
    }
  }
  const fresh = () =>
    setEditing({
      id: '',
      kind: 'custom_' + requestId().replaceAll('-', ''),
      name: '',
      body: '兹证明，{{姓名}}（学号：{{学号}}）为我校学生。\n\n特此证明。\n\n{{落款}}\n{{开具日期}}',
      format: 'text',
      requiredFields: ['name', 'studentNumber', 'signature', 'issueDate'],
      version: 0,
      originalFileName: '',
      createdAt: new Date().toISOString(),
    });
  return (
    <>
      <section className="template-heading">
        <div>
          <h2>证明模板</h2>
          <p>编辑正文，或上传已有的 Word 模板。</p>
        </div>
        <div className="heading-actions">
          <span className="template-count">{templates.length} 类模板</span>
          <Button icon="plus" variant="primary" onClick={fresh}>
            新建模板
          </Button>
        </div>
      </section>
      {templates.length ? (
        <div className="template-grid">
          {templates.map((t, i) => (
            <article className="template-card" key={t.id}>
              <div className={'template-visual visual-' + (i % 3)}>
                <div className="mini-document">
                  <i />
                  <strong>{t.name}</strong>
                  <span />
                  <span />
                  <span />
                  <em />
                </div>
                <span className="template-format-badge">{t.format === 'docx' ? 'WORD' : 'A4'}</span>
              </div>
              <div className="template-card-content">
                <div>
                  <h3>{t.name}</h3>
                  <span className="version-tag">v{t.version}</span>
                </div>
                <p>
                  {t.requiredFields.length} 个自动填充字段
                  <span>更新于 {shortDate(t.createdAt)}</span>
                </p>
                <div className="template-card-bottom">
                  <span>
                    <i className="small-green-dot" />
                    使用中
                  </span>
                  <div className="template-card-actions">
                    <Button
                      variant="text"
                      icon="download"
                      disabled={downloading === t.id}
                      onClick={() => void download(t)}
                    >
                      下载
                    </Button>
                    <Button variant="text" icon="edit" onClick={() => setEditing(t)}>
                      编辑
                    </Button>
                    <Button
                      variant="text"
                      icon="trash"
                      className="template-delete-button"
                      title={'删除' + t.name}
                      onClick={() => {
                        setError('');
                        setDeleting(t);
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="还没有证明模板" icon="certificate">
          <Button icon="plus" variant="primary" onClick={fresh}>
            新建模板
          </Button>
        </Empty>
      )}
      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
            notify('模板已更新，历史证明保持原样');
          }}
        />
      )}
      {deleting && (
        <Modal
          title="删除模板"
          className="template-delete-modal"
          onClose={() => {
            if (!removing) setDeleting(null);
          }}
          footer={
            <>
              <Button disabled={removing} onClick={() => setDeleting(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                disabled={removing}
                icon="trash"
                onClick={() => void remove()}
              >
                {removing ? '正在删除…' : '删除模板'}
              </Button>
            </>
          }
        >
          <ErrorBox error={error} />
          <p>
            确定删除“<strong>{deleting.name}</strong>”吗？
          </p>
          <p className="delete-template-note">已开具的证明不受影响，仍可查看和打印。</p>
        </Modal>
      )}
    </>
  );
}
