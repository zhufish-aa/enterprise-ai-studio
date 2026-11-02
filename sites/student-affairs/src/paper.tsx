import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { date, dateFields, fields, type Certificate, type Template } from './data';
import { englishValue, isEnglishText } from '../shared/bilingual';
import { RichPaper, FilledField } from './rich-document';
import { fieldKeyForLabel } from '../shared/student-model';
export function Paper({
  template,
  values,
  contentBase64,
  onReady,
}: {
  template: Template;
  values: Record<string, string>;
  contentBase64?: string | null;
  onReady?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    if (!contentBase64 || !ref.current) {
      onReady?.();
      return;
    }
    const el = ref.current;
    el.replaceChildren();
    setError('');
    const buffer = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0));
    void renderAsync(buffer.buffer, el, undefined, {
      inWrapper: false,
      useBase64URL: true,
      ignoreLastRenderedPageBreak: false,
      renderHeaders: true,
      renderFooters: true,
      breakPages: true,
    })
      .then(() => {
        if (current) onReady?.();
      })
      .catch(() => {
        if (current) setError('Word 预览未能加载，可以下载原文件后打印。');
      });
    return () => {
      current = false;
    };
  }, [contentBase64, onReady]);
  const substitute = (s: string, english: boolean) =>
    s.split(/(\{\{[^{}]+\}\})/g).map((part, i) => {
      if (!part.startsWith('{{')) return part;
      const label = part.slice(2, -2).trim(),
        key = fieldKeyForLabel(label) ?? '',
        raw = values[key] ?? '',
        value = english ? englishValue(key, raw, values) : dateFields.has(key) ? date(raw) : raw;
      return value ? (
        <FilledField key={i} fieldKey={key} value={value} />
      ) : (
        <span className="paper-placeholder" key={i}>
          {label}
        </span>
      );
    });
  if (template.document && !contentBase64)
    return (
      <RichPaper
        document={template.document}
        values={{ ...values, templateTitle: template.name }}
      />
    );
  return contentBase64 ? (
    <div className="word-document">
      <div ref={ref} />
      {error && <p className="word-error">{error}</p>}
    </div>
  ) : (
    <article className="certificate-paper">
      <div className="paper-topline">
        {values['schoolName'] || ''}
        <span>{values['certificateNumber'] || ''}</span>
      </div>
      <h2>{template.name}</h2>
      <div className="paper-rule" />
      <div className="paper-body">
        {template.body.split(/\n\s*\n/).map((p, i) => (
          <p
            key={i}
            className={p.includes('{{落款}}') || p.includes('{{开具日期}}') ? 'paper-signoff' : ''}
          >
            {substitute(p, isEnglishText(p))}
          </p>
        ))}
      </div>
    </article>
  );
}
export function printCertificate(certificate: Certificate) {
  window.dispatchEvent(new CustomEvent('student-center.print', { detail: certificate }));
}
export function PrintStation() {
  const [document, setDocument] = useState<Certificate | null>(null),
    printed = useRef(false);
  useEffect(() => {
    const receive = (e: Event) => {
        printed.current = false;
        setDocument((e as CustomEvent<Certificate>).detail);
      },
      done = () => {
        setDocument(null);
        printed.current = false;
      };
    window.addEventListener('student-center.print', receive);
    window.addEventListener('afterprint', done);
    return () => {
      window.removeEventListener('student-center.print', receive);
      window.removeEventListener('afterprint', done);
    };
  }, []);
  const ready = useRef<() => void>(() => {
    if (printed.current) return;
    printed.current = true;
    void window.document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        window.print();
      }),
    );
  });
  return (
    <div className="print-station">
      {document && (
        <Paper
          template={document.template}
          values={document.fields}
          contentBase64={document.contentBase64}
          onReady={ready.current}
        />
      )}
    </div>
  );
}
