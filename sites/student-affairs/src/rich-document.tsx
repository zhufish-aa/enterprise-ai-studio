import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { date, dateFields, fields, type S, type Template } from './data';
import { fieldKeyForLabel } from '../shared/student-model';
import { englishValue, isEnglishText } from '../shared/bilingual';
export type RichDocument = S['StudentRichDocument'];
export type RichNode = S['StudentRichNode'];
export type RichMark = S['StudentRichMark'];
export const fontChoices = [
  ['SimSun', '宋体'],
  ['Microsoft YaHei', '微软雅黑'],
  ['SimHei', '黑体'],
  ['FangSong', '仿宋'],
  ['KaiTi', '楷体'],
  ['Arial', 'Arial'],
  ['Times New Roman', 'Times New Roman'],
  ['Calibri', 'Calibri'],
] as const;
/** Recognize placeholders in documents saved before Word import created field nodes. */
export function normalizeTemplateFields(document: RichDocument): RichDocument {
  const inline = (nodes: RichNode[]): RichNode[] => {
    const result: RichNode[] = [];
    let pending: RichNode[] = [];
    const flush = () => {
      if (!pending.length) return;
      let offset = 0;
      const spans = pending.map((node) => {
          const start = offset;
          offset += (node.text ?? '').length;
          return { node, start, end: offset };
        }),
        text = pending.map((n) => n.text ?? '').join('');
      const append = (start: number, end: number) => {
        for (const span of spans) {
          const from = Math.max(start, span.start),
            to = Math.min(end, span.end);
          if (to > from) result.push({ ...span.node, text: text.slice(from, to) });
        }
      };
      let cursor = 0;
      for (const match of text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
        const label = match[1]!.trim(),
          key = fieldKeyForLabel(label);
        if (!key) continue;
        const start = match.index,
          styleAt = start + match[0].indexOf(label),
          marks = spans.find((s) => s.start <= styleAt && s.end > styleAt)?.node.marks;
        append(cursor, start);
        result.push({
          type: 'templateField',
          attrs: { fieldKey: key },
          ...(marks?.length ? { marks } : {}),
        });
        cursor = start + match[0].length;
      }
      append(cursor, text.length);
      pending = [];
    };
    for (const node of nodes) {
      if (node.type === 'text') pending.push(node);
      else {
        flush();
        result.push(node);
      }
    }
    flush();
    return result;
  };
  const visit = (node: RichNode): RichNode =>
    node.content ? { ...node, content: inline(node.content.map(visit)) } : node;
  return { ...document, content: document.content.map(visit) };
}
export function FilledField({ fieldKey, value }: { fieldKey: string; value: string }) {
  const compact =
    dateFields.has(fieldKey) ||
    ['studentNumber', 'idNumber', 'certificateNumber'].includes(fieldKey);
  return (
    <span className={'filled-template-field' + (compact ? ' compact-value' : '')}>{value}</span>
  );
}
function textNodes(value: string, marks?: RichMark[]): RichNode[] {
  return value
    .split(/(\{\{[^{}]+\}\}|\n)/g)
    .filter(Boolean)
    .map((part) => {
      if (part === '\n') return { type: 'hardBreak' };
      if (part.startsWith('{{')) {
        const key = fieldKeyForLabel(part.slice(2, -2));
        if (key)
          return { type: 'templateField', attrs: { fieldKey: key }, ...(marks ? { marks } : {}) };
      }
      return { type: 'text', text: part, ...(marks ? { marks } : {}) };
    });
}
export function initialDocument(template: Template): RichDocument {
  if (template.document) return normalizeTemplateFields(template.document);
  return {
    schemaVersion: '1.0',
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign: 'left', spaceAfter: 0 },
        content: [
          {
            type: 'templateField',
            attrs: { fieldKey: 'schoolName' },
            marks: [
              {
                type: 'textStyle',
                attrs: { fontFamily: 'Microsoft YaHei', fontSize: '12pt', color: '#334155' },
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center', spaceBefore: 48, spaceAfter: 28 },
        content: [
          {
            type: 'templateField',
            attrs: { fieldKey: 'templateTitle' },
            marks: [
              { type: 'textStyle', attrs: { fontFamily: 'SimSun', fontSize: '24pt' } },
              { type: 'bold' },
            ],
          },
        ],
      },
      { type: 'horizontalRule' },
      ...template.body.split(/\n\s*\n/).map((p): RichNode => {
        const sign = p.includes('{{落款}}') || p.includes('{{开具日期}}');
        return {
          type: 'paragraph',
          attrs: {
            textAlign: sign ? 'right' : 'left',
            lineHeight: '2',
            firstLineIndent: sign ? 0 : 2,
            spaceBefore: sign ? 32 : 0,
            spaceAfter: 16,
          },
          content: textNodes(p, [
            { type: 'textStyle', attrs: { fontFamily: 'SimSun', fontSize: '12pt' } },
          ]),
        };
      }),
    ],
  };
}
function markStyle(attrs: RichMark['attrs']): CSSProperties {
  return { fontFamily: attrs?.fontFamily, fontSize: attrs?.fontSize, color: attrs?.color };
}
function nodeStyle(node: RichNode): CSSProperties {
  const a = node.attrs;
  return {
    textAlign: a?.textAlign,
    lineHeight: a?.lineHeight,
    textIndent: a?.firstLineIndent !== undefined ? a.firstLineIndent + 'em' : undefined,
    marginTop: a?.spaceBefore !== undefined ? a.spaceBefore + 'pt' : undefined,
    marginBottom: a?.spaceAfter !== undefined ? a.spaceAfter + 'pt' : undefined,
  };
}
function wrapMarks(content: ReactNode, marks: RichMark[] = []) {
  return marks.reduceRight<ReactNode>((value, mark, i) => {
    switch (mark.type) {
      case 'bold':
        return <strong key={i}>{value}</strong>;
      case 'italic':
        return <em key={i}>{value}</em>;
      case 'underline':
        return <u key={i}>{value}</u>;
      case 'strike':
        return <s key={i}>{value}</s>;
      case 'textStyle':
        return (
          <span style={markStyle(mark.attrs)} key={i}>
            {value}
          </span>
        );
    }
  }, content);
}
function inlineText(text: string, values: Record<string, string>, english: boolean) {
  return text.split(/(\{\{[^{}]+\}\})/g).map((part, i) => {
    if (!part.startsWith('{{')) return part;
    const label = part.slice(2, -2).trim(),
      key = fieldKeyForLabel(label) ?? '',
      raw = values[key] ?? '';
    return raw ? (
      <FilledField
        key={i}
        fieldKey={key}
        value={english ? englishValue(key, raw, values) : dateFields.has(key) ? date(raw) : raw}
      />
    ) : (
      <span className="paper-placeholder" key={i}>
        {label}
      </span>
    );
  });
}
function blockText(node: RichNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'templateField') return ' ';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(blockText).join('');
}
function render(
  node: RichNode,
  values: Record<string, string>,
  key: number,
  english = false,
): ReactNode {
  const block =
      node.type === 'paragraph' || node.type === 'heading'
        ? isEnglishText(blockText(node))
        : english,
    children = node.content?.map((n, i) => render(n, values, i, block)),
    style = nodeStyle(node);
  switch (node.type) {
    case 'text':
      return (
        <Fragment key={key}>
          {wrapMarks(inlineText(node.text ?? '', values, block), node.marks)}
        </Fragment>
      );
    case 'templateField': {
      const k = node.attrs?.fieldKey ?? '',
        raw = values[k] ?? '',
        text = raw
          ? block
            ? englishValue(k, raw, values)
            : dateFields.has(k)
              ? date(raw)
              : raw
          : null;
      return (
        <Fragment key={key}>
          {wrapMarks(
            text !== null ? (
              <FilledField fieldKey={k} value={text} />
            ) : (
              <span className="paper-placeholder">{fields[k] ?? k}</span>
            ),
            node.marks,
          )}
        </Fragment>
      );
    }
    case 'hardBreak':
      return <br key={key} />;
    case 'horizontalRule':
      return <hr key={key} />;
    case 'paragraph':
      return (
        <p key={key} style={style}>
          {children?.length ? children : <br />}
        </p>
      );
    case 'heading':
      return node.attrs?.level === 2 ? (
        <h2 key={key} style={style}>
          {children}
        </h2>
      ) : node.attrs?.level === 3 ? (
        <h3 key={key} style={style}>
          {children}
        </h3>
      ) : (
        <h1 key={key} style={style}>
          {children}
        </h1>
      );
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={node.attrs?.start}>
          {children}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'table':
      return (
        <table key={key}>
          <tbody>{children}</tbody>
        </table>
      );
    case 'tableRow':
      return <tr key={key}>{children}</tr>;
    case 'tableCell':
      return (
        <td key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>
          {children}
        </td>
      );
    case 'tableHeader':
      return (
        <th key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>
          {children}
        </th>
      );
    case 'image':
      return (
        <img
          key={key}
          src={node.attrs?.src}
          width={node.attrs?.width}
          height={node.attrs?.height}
          alt={node.attrs?.alt ?? ''}
        />
      );
  }
}
export function RichPaper({
  document,
  values,
}: {
  document: RichDocument;
  values: Record<string, string>;
}) {
  return (
    <article className="certificate-paper rich-paper">
      <div className="document-content">{document.content.map((n, i) => render(n, values, i))}</div>
    </article>
  );
}
