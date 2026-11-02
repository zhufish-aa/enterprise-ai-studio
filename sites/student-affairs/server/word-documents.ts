import { posix } from 'node:path';
import { createHash } from 'node:crypto';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer, type Element as XmlElement } from '@xmldom/xmldom';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  BorderStyle,
  WidthType,
  LineRuleType,
  TableLayoutType,
  type IRunOptions,
} from 'docx';
import type { components } from '../shared/contracts.js';
import { Fault } from './errors.js';
import { fields } from './definitions.js';
import { documentText } from './rich-document.js';
type S = components['schemas'];
type Node = S['StudentRichNode'];
type Mark = S['StudentRichMark'];
type Attr = NonNullable<Node['attrs']>;
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const templatePart = 'customXml/eas-student-template.xml',
  templateNamespace = 'urn:enterprise-ai-studio:student-template:v1',
  packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
/** Native Word content is always authoritative after an external Word/WPS edit. */
function wordDigest(zip: PizZip) {
  const hash = createHash('sha256');
  for (const path of Object.keys(zip.files)
    .filter((path) => path.startsWith('word/') && !zip.files[path]?.dir)
    .sort()) {
    hash.update(path + '\0');
    hash.update(zip.file(path)!.asNodeBuffer());
    hash.update('\0');
  }
  return hash.digest('hex');
}
const children = (el: XmlElement) =>
  Array.from(el.childNodes).filter((n): n is XmlElement => n.nodeType === 1);
const direct = (el: XmlElement | undefined, name: string) =>
  el ? children(el).find((n) => n.namespaceURI === W && n.localName === name) : undefined;
const attr = (el: XmlElement | undefined, key = 'val') => el?.getAttributeNS(W, key) ?? '';
const descendants = (el: XmlElement, name: string) =>
  Array.from(el.getElementsByTagNameNS(W, name));
const fontMap: Record<string, NonNullable<Mark['attrs']>['fontFamily']> = {
  宋体: 'SimSun',
  新宋体: 'SimSun',
  SimSun: 'SimSun',
  微软雅黑: 'Microsoft YaHei',
  'Microsoft YaHei': 'Microsoft YaHei',
  黑体: 'SimHei',
  SimHei: 'SimHei',
  仿宋: 'FangSong',
  FangSong: 'FangSong',
  楷体: 'KaiTi',
  KaiTi: 'KaiTi',
  Arial: 'Arial',
  Calibri: 'Arial',
  'Times New Roman': 'SimSun',
};
const enabled = (p: XmlElement | undefined) => !!p && !['0', 'false', 'off'].includes(attr(p));
const fieldKeys = new Map(Object.entries(fields).map(([key, label]) => [label, key]));
/** Word may split a placeholder across differently formatted runs. Keep surrounding runs intact. */
function fieldNodes(nodes: Node[]): Node[] {
  const result: Node[] = [];
  let pending: Node[] = [];
  const flush = () => {
    if (!pending.length) return;
    let offset = 0;
    const spans = pending.map((node) => {
        const start = offset;
        offset += (node.text ?? '').length;
        return { node, start, end: offset };
      }),
      text = pending.map((n) => n.text ?? '').join('');
    const appendText = (start: number, end: number) => {
      for (const span of spans) {
        const from = Math.max(start, span.start),
          to = Math.min(end, span.end);
        if (to > from) result.push({ ...span.node, text: text.slice(from, to) });
      }
    };
    let cursor = 0;
    for (const match of text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
      const label = match[1]!.trim(),
        key = fieldKeys.get(label);
      if (!key) continue;
      const start = match.index,
        end = start + match[0].length,
        styleAt = start + match[0].indexOf(label),
        marks = spans.find((s) => s.start <= styleAt && s.end > styleAt)?.node.marks;
      appendText(cursor, start);
      result.push({
        type: 'templateField',
        attrs: { fieldKey: key },
        ...(marks?.length ? { marks } : {}),
      });
      cursor = end;
    }
    appendText(cursor, text.length);
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
}
function xml(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Invalid document XML');
  return new DOMParser({
    onError: () => {
      throw new Error('Invalid document XML');
    },
  }).parseFromString(text, 'application/xml');
}
/** Parse document content as OOXML data. No HTML execution, external fetches, or field preconditions. */
export function importWord(
  content: Buffer,
  fileName: string,
  validateDocument?: (value: unknown) => boolean,
): S['StudentTemplateImportResult'] {
  try {
    const zip = new PizZip(content),
      main = zip.file('word/document.xml');
    if (!main) throw new Error('Missing document');
    const notes = new Set<string>(),
      styleNodes = new Map<string, XmlElement>(),
      styles = zip.file('word/styles.xml'),
      suggestedName = fileName.replace(/^.*[\\/]/, '').replace(/\.docx$/i, '');
    const saved = zip.file(templatePart);
    if (saved && validateDocument) {
      try {
        const root = xml(saved.asText()).documentElement,
          payload = root?.getElementsByTagNameNS(templateNamespace, 'document')[0];
        if (
          root?.namespaceURI === templateNamespace &&
          root.getAttribute('digest') === wordDigest(zip) &&
          payload?.getAttribute('encoding') === 'base64'
        ) {
          const candidate: unknown = JSON.parse(
            Buffer.from(payload.textContent ?? '', 'base64').toString('utf8'),
          );
          if (validateDocument(candidate)) {
            const document = candidate as S['StudentRichDocument'];
            return { document, body: documentText(document), suggestedName, notes: [] };
          }
        }
      } catch {
        /* Missing/stale/invalid editor metadata falls back to the actual Word document below. */
      }
    }
    if (styles)
      for (const n of Array.from(xml(styles.asText()).getElementsByTagNameNS(W, 'style')))
        styleNodes.set(attr(n, 'styleId'), n);
    const inherited = (id: string, kind: 'pPr' | 'rPr', seen = new Set<string>()): XmlElement[] => {
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const s = styleNodes.get(id);
      if (!s) return [];
      return [
        ...inherited(attr(direct(s, 'basedOn')), kind, seen),
        ...children(s).filter((n) => n.namespaceURI === W && n.localName === kind),
      ];
    };
    const defaults = styles
      ? xml(styles.asText()).getElementsByTagNameNS(W, 'docDefaults')[0]
      : undefined;
    const defaultRun = defaults?.getElementsByTagNameNS(W, 'rPr')[0];
    const marks = (properties: XmlElement[]): Mark[] => {
      const list: Mark[] = [],
        a: NonNullable<Mark['attrs']> = {};
      for (const p of properties) {
        for (const [tag, type] of [
          ['b', 'bold'],
          ['i', 'italic'],
          ['u', 'underline'],
          ['strike', 'strike'],
        ] as const) {
          const n = direct(p, tag);
          if (!n) continue;
          const old = list.findIndex((m) => m.type === type);
          if (old >= 0) list.splice(old, 1);
          if (enabled(n) && attr(n) !== 'none') list.push({ type });
        }
        const f = direct(p, 'rFonts'),
          family = attr(f, 'eastAsia') || attr(f, 'ascii') || attr(f, 'hAnsi');
        if (family) a.fontFamily = fontMap[family] ?? 'SimSun';
        const size = Number(attr(direct(p, 'sz')));
        if (size > 0) a.fontSize = size / 2 + 'pt';
        const c = attr(direct(p, 'color'));
        if (/^[a-f\d]{6}$/i.test(c)) a.color = '#' + c;
      }
      if (Object.keys(a).length) list.push({ type: 'textStyle', attrs: a });
      return list;
    };
    const properties = (ps: XmlElement[]): Attr => {
      const a: Attr = { firstLineIndent: 0, spaceBefore: 0, spaceAfter: 12 };
      for (const p of ps) {
        const align = attr(direct(p, 'jc'));
        if (align)
          a.textAlign =
            align === 'center'
              ? 'center'
              : align === 'right' || align === 'end'
                ? 'right'
                : align === 'both' || align === 'distribute'
                  ? 'justify'
                  : 'left';
        const spacing = direct(p, 'spacing');
        for (const [source, target] of [
          ['before', 'spaceBefore'],
          ['after', 'spaceAfter'],
        ] as const) {
          const v = attr(spacing, source);
          if (v !== '') a[target] = Math.max(0, Number(v) / 20);
        }
        const line = Number(attr(spacing, 'line'));
        if (line > 0) a.lineHeight = String(Math.round((line / 240) * 1000) / 1000);
        const ind = direct(p, 'ind'),
          chars = attr(ind, 'firstLineChars'),
          first = attr(ind, 'firstLine');
        if (chars) a.firstLineIndent = Math.max(0, Number(chars) / 100);
        else if (first) a.firstLineIndent = Math.max(0, Number(first) / 240);
        const level = attr(direct(p, 'outlineLvl'));
        if (level !== '' && Number(level) < 3) a.level = (Number(level) + 1) as 1 | 2 | 3;
      }
      return a;
    };
    const rels = (part: string) => {
      const f = zip.file(posix.join(posix.dirname(part), '_rels', posix.basename(part) + '.rels')),
        map = new Map<string, string>();
      if (f)
        for (const n of Array.from(xml(f.asText()).getElementsByTagNameNS('*', 'Relationship'))) {
          if (n.getAttribute('TargetMode') === 'External') continue;
          const target = n.getAttribute('Target') ?? '',
            path = target.startsWith('/')
              ? target.slice(1)
              : posix.normalize(posix.join(posix.dirname(part), target));
          if (path.startsWith('word/')) map.set(n.getAttribute('Id') ?? '', path);
        }
      return map;
    };
    const parsePart = (part: string): Node[] => {
      const f = zip.file(part);
      if (!f) return [];
      const doc = xml(f.asText()),
        links = rels(part);
      const image = (el: XmlElement): Node[] => {
        const blip = el.getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/drawingml/2006/main',
            'blip',
          )[0],
          legacy = el.getElementsByTagNameNS('urn:schemas-microsoft-com:vml', 'imagedata')[0],
          id = blip?.getAttributeNS(R, 'embed') || legacy?.getAttributeNS(R, 'id') || '',
          path = links.get(id);
        if (!path) return [];
        const ext = posix.extname(path).slice(1).toLowerCase(),
          mime =
            ext === 'jpg' || ext === 'jpeg'
              ? 'jpeg'
              : ext === 'png' || ext === 'gif' || ext === 'bmp'
                ? ext
                : null,
          asset = zip.file(path);
        if (!mime || !asset) {
          notes.add('部分图片格式需要在 Word 中另存为 PNG 或 JPG 后使用。');
          return [];
        }
        const size = el.getElementsByTagNameNS(
            'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
            'extent',
          )[0],
          width = Number(size?.getAttribute('cx')) / 9525,
          height = Number(size?.getAttribute('cy')) / 9525;
        return [
          {
            type: 'image',
            attrs: {
              src: 'data:image/' + mime + ';base64,' + asset.asNodeBuffer().toString('base64'),
              alt: '',
              ...(width > 0 ? { width } : {}),
              ...(height > 0 ? { height } : {}),
            },
          },
        ];
      };
      const paragraph = (p: XmlElement): Node => {
        const pp = direct(p, 'pPr'),
          id = attr(direct(pp, 'pStyle')),
          pStyles = [...inherited(id, 'pPr'), ...(pp ? [pp] : [])],
          rStyles = [
            ...(defaultRun ? [defaultRun] : []),
            ...inherited(id, 'rPr'),
            ...(direct(pp, 'rPr') ? [direct(pp, 'rPr')!] : []),
          ],
          a = properties(pStyles),
          content: Node[] = [];
        const walk = (el: XmlElement) => {
          if (el.namespaceURI === W && el.localName === 'r') {
            const rp = direct(el, 'rPr'),
              styleId = attr(direct(rp, 'rStyle')),
              m = marks([...rStyles, ...inherited(styleId, 'rPr'), ...(rp ? [rp] : [])]);
            for (const n of children(el)) {
              if (n.localName === 't' && n.namespaceURI === W) {
                const text = n.textContent ?? '';
                if (text) content.push({ type: 'text', text, ...(m.length ? { marks: m } : {}) });
              } else if (n.namespaceURI === W && ['br', 'cr'].includes(n.localName ?? ''))
                content.push({ type: 'hardBreak' });
              else if (n.namespaceURI === W && n.localName === 'tab')
                content.push({ type: 'text', text: '\t', ...(m.length ? { marks: m } : {}) });
              else if (['drawing', 'pict'].includes(n.localName ?? '')) content.push(...image(n));
            }
            return;
          }
          for (const n of children(el))
            if (!['pPr', 'rPr', 'del'].includes(n.localName ?? '')) walk(n);
        };
        walk(p);
        const merged: Node[] = [];
        for (const n of content) {
          const previous = merged.at(-1);
          if (
            n.type === 'text' &&
            previous?.type === 'text' &&
            JSON.stringify(n.marks ?? []) === JSON.stringify(previous.marks ?? [])
          )
            previous.text = (previous.text ?? '') + (n.text ?? '');
          else merged.push(n);
        }
        return { type: a.level ? 'heading' : 'paragraph', attrs: a, content: fieldNodes(merged) };
      };
      const paragraphBlocks = (p: XmlElement): Node[] => {
        const pp = direct(p, 'pPr'),
          style = attr(direct(pp, 'pStyle')),
          ps = [...inherited(style, 'pPr'), ...(pp ? [pp] : [])];
        let top = false,
          bottom = false;
        for (const properties of ps) {
          const border = direct(properties, 'pBdr');
          for (const side of ['top', 'bottom'] as const) {
            const edge = direct(border, side);
            if (edge) {
              const visible = !['nil', 'none'].includes(attr(edge));
              if (side === 'top') top = visible;
              else bottom = visible;
            }
          }
        }
        const node = paragraph(p),
          hasContent = node.content?.some((n) => n.type !== 'text' || !!n.text?.trim());
        return [
          ...(top ? [{ type: 'horizontalRule' as const }] : []),
          ...(!(top || bottom) || hasContent ? [node] : []),
          ...(bottom ? [{ type: 'horizontalRule' as const }] : []),
        ];
      };
      const blocks = (el: XmlElement): Node[] => {
        const result: Node[] = [];
        for (const n of children(el)) {
          if (n.namespaceURI === W && n.localName === 'p') result.push(...paragraphBlocks(n));
          else if (n.namespaceURI === W && n.localName === 'tbl') {
            const rows: Node[] = children(n)
              .filter((x) => x.namespaceURI === W && x.localName === 'tr')
              .map((row) => ({
                type: 'tableRow',
                content: children(row)
                  .filter((x) => x.namespaceURI === W && x.localName === 'tc')
                  .map((cell) => {
                    const cp = direct(cell, 'tcPr'),
                      span = Math.max(1, Number(attr(direct(cp, 'gridSpan'))) || 1),
                      body = blocks(cell);
                    return {
                      type: 'tableCell' as const,
                      attrs: { colspan: span, rowspan: 1 },
                      content: body.length ? body : [{ type: 'paragraph', content: [] }],
                    };
                  }),
              }));
            if (rows.length) result.push({ type: 'table', content: rows });
          } else if (
            n.namespaceURI === W &&
            ['sdt', 'sdtContent', 'customXml', 'ins'].includes(n.localName ?? '')
          )
            result.push(...blocks(n));
        }
        return result;
      };
      const root = doc.getElementsByTagNameNS(W, 'body')[0] ?? doc.documentElement;
      if (!root) throw new Error('Empty document');
      return blocks(root);
    };
    const doc = xml(main.asText()),
      links = rels('word/document.xml'),
      parts = (tag: string) => [
        ...new Set(
          Array.from(doc.getElementsByTagNameNS(W, tag))
            .map((n) => links.get(n.getAttributeNS(R, 'id') ?? ''))
            .filter((v): v is string => !!v),
        ),
      ];
    const contentNodes = [
        ...parts('headerReference').flatMap(parsePart),
        ...parsePart('word/document.xml'),
        ...parts('footerReference').flatMap(parsePart),
      ],
      document: S['StudentRichDocument'] = {
        schemaVersion: '1.0',
        type: 'doc',
        content: contentNodes.length ? contentNodes : [{ type: 'paragraph', content: [] }],
      };
    return { document, body: documentText(document), suggestedName, notes: [...notes] };
  } catch (e) {
    if (e instanceof Fault) throw e;
    throw new Fault(422, 'TEMPLATE_INVALID', '无法读取这个 Word 文件，请使用有效的 .docx 文件。');
  }
}
export function legacyDocument(body: string, _name: string): S['StudentRichDocument'] {
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
              { type: 'bold' },
              { type: 'textStyle', attrs: { fontSize: '24pt', fontFamily: 'SimSun' } },
            ],
          },
        ],
      },
      { type: 'horizontalRule' },
      ...body.split(/\n\s*\n/).map((text): Node => {
        const sign = text.includes('{{落款}}') || text.includes('{{开具日期}}');
        return {
          type: 'paragraph',
          attrs: {
            textAlign: sign ? 'right' : 'left',
            firstLineIndent: sign ? 0 : 2,
            lineHeight: '2',
            spaceBefore: sign ? 32 : 0,
            spaceAfter: 16,
          },
          content: fieldNodes(
            text.split('\n').flatMap((line, i) => [
              ...(i ? [{ type: 'hardBreak' as const }] : []),
              ...(line
                ? [
                    {
                      type: 'text' as const,
                      text: line,
                      marks: [
                        {
                          type: 'textStyle' as const,
                          attrs: { fontFamily: 'SimSun' as const, fontSize: '12pt' },
                        },
                      ],
                    },
                  ]
                : []),
            ]),
          ),
        };
      }),
    ],
  };
}
/** DOCX export keeps field placeholders as editable Word text, not generated student values. */
export async function exportWord(document: S['StudentRichDocument'], name: string) {
  documentText(document);
  const runs = (nodes: Node[], defaultSize = 24, defaultBold = false): Array<TextRun | ImageRun> =>
    nodes.flatMap((n): Array<TextRun | ImageRun> => {
      if (n.type === 'hardBreak') return [new TextRun({ break: 1 })];
      if (n.type === 'image') {
        const match = /^data:image\/(png|jpeg|gif|bmp);base64,(.+)$/.exec(n.attrs?.src ?? '');
        if (!match) return [];
        return [
          new ImageRun({
            type: match[1] === 'jpeg' ? 'jpg' : (match[1] as 'png' | 'gif' | 'bmp'),
            data: Buffer.from(match[2]!, 'base64'),
            transformation: { width: n.attrs?.width ?? 160, height: n.attrs?.height ?? 80 },
          }),
        ];
      }
      let text =
        n.type === 'templateField' ? '{{' + fields[n.attrs?.fieldKey ?? ''] + '}}' : (n.text ?? '');
      let options: IRunOptions = {
        text,
        font: { ascii: 'SimSun', hAnsi: 'SimSun', eastAsia: 'SimSun' },
        size: defaultSize,
        ...(defaultBold ? { bold: true } : {}),
        ...Object.fromEntries(
          (n.marks ?? [])
            .filter((m) => ['bold', 'italic', 'strike'].includes(m.type))
            .map((m) => [m.type === 'italic' ? 'italics' : m.type, true]),
        ),
        ...((n.marks ?? []).some((m) => m.type === 'underline') ? { underline: {} } : {}),
      };
      const style = n.marks?.find((m) => m.type === 'textStyle')?.attrs;
      if (style?.fontFamily)
        options = {
          ...options,
          font: { ascii: style.fontFamily, hAnsi: style.fontFamily, eastAsia: style.fontFamily },
        };
      if (style?.fontSize) options = { ...options, size: parseFloat(style.fontSize) * 2 };
      if (style?.color) options = { ...options, color: style.color.slice(1) };
      return text
        .split('\n')
        .flatMap((line, i) => [
          ...(i ? [new TextRun({ break: 1 })] : []),
          new TextRun({ ...options, text: line }),
        ]);
    });
  const blocks = (nodes: Node[]): Array<Paragraph | Table> =>
    nodes.flatMap((n): Array<Paragraph | Table> => {
      if (n.type === 'table') {
        const cells = n.content?.[0]?.content ?? [],
          columnCount = cells.reduce((count, cell) => count + (cell.attrs?.colspan ?? 1), 0),
          columnWidths = cells.flatMap((cell) =>
            Array.from({ length: cell.attrs?.colspan ?? 1 }, (_, i) =>
              cell.attrs?.colwidth?.[i]
                ? Math.round(cell.attrs.colwidth[i]! * 15)
                : Math.round(8958 / Math.max(1, columnCount)),
            ),
          ),
          edge = { color: '9BA8BA', style: BorderStyle.SINGLE, size: 6 };
        return [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            ...(columnWidths.length ? { columnWidths } : {}),
            borders: {
              top: edge,
              bottom: edge,
              left: edge,
              right: edge,
              insideHorizontal: edge,
              insideVertical: edge,
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            rows: (n.content ?? []).map(
              (row) =>
                new TableRow({
                  children: (row.content ?? []).map((cell) => {
                    const content = blocks(cell.content ?? []);
                    return new TableCell({
                      children: content.length ? content : [new Paragraph('')],
                      columnSpan: cell.attrs?.colspan ?? 1,
                      rowSpan: cell.attrs?.rowspan ?? 1,
                    });
                  }),
                }),
            ),
          }),
        ];
      }
      if (['bulletList', 'orderedList'].includes(n.type))
        return (n.content ?? []).flatMap((item, i) => {
          const content = [...(item.content ?? [])],
            first = content[0];
          if (first?.type === 'paragraph')
            content[0] = {
              ...first,
              content: [
                {
                  type: 'text',
                  text: n.type === 'bulletList' ? '• ' : String((n.attrs?.start ?? 1) + i) + '. ',
                },
                ...(first.content ?? []),
              ],
            };
          return blocks(content);
        });
      if (n.type === 'listItem') return blocks(n.content ?? []);
      if (n.type === 'horizontalRule')
        return [
          new Paragraph({
            children: [new TextRun({ text: ' ', size: 2 })],
            border: { top: { color: '66758C', style: BorderStyle.SINGLE, size: 6, space: 0 } },
            spacing: { before: 0, after: 440, line: 20, lineRule: LineRuleType.EXACT },
          }),
        ];
      const a = n.attrs,
        heading = n.type === 'heading',
        level = a?.level ?? 1,
        alignment =
          a?.textAlign === 'center'
            ? AlignmentType.CENTER
            : a?.textAlign === 'right'
              ? AlignmentType.RIGHT
              : a?.textAlign === 'justify'
                ? AlignmentType.JUSTIFIED
                : AlignmentType.LEFT;
      return [
        new Paragraph({
          children: runs(
            n.content ?? [n],
            heading ? (level === 1 ? 48 : level === 2 ? 36 : 32) : 24,
            heading,
          ),
          alignment,
          ...(heading ? { outlineLevel: level - 1 } : {}),
          indent: { firstLineChars: Math.round((a?.firstLineIndent ?? 0) * 100) },
          spacing: {
            before: Math.round((a?.spaceBefore ?? 0) * 20),
            after: Math.round((a?.spaceAfter ?? 12) * 20),
            line: Math.round(Number(a?.lineHeight ?? (heading ? 1.5 : 2)) * 240),
            lineRule: LineRuleType.AUTO,
          },
        }),
      ];
    });
  const content = blocks(document.content),
    doc = new Document({
      creator: '学生事务中心',
      title: name,
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1417, bottom: 1531, left: 1474, right: 1474 },
            },
          },
          children: content.length ? content : [new Paragraph('')],
        },
      ],
    });
  const zip = new PizZip(await Packer.toBuffer(doc)),
    relationships = zip.file('word/_rels/document.xml.rels');
  if (relationships) {
    const rels = xml(relationships.asText()),
      link = rels.createElementNS(packageRelationships, 'Relationship');
    link.setAttribute('Id', 'rIdEasStudentTemplate');
    link.setAttribute('Type', R + '/customXml');
    link.setAttribute('Target', '../' + templatePart);
    rels.documentElement!.appendChild(link);
    zip.file('word/_rels/document.xml.rels', new XMLSerializer().serializeToString(rels));
  }
  // Carry the same validated editor model inside the DOCX for lossless re-import of our exports.
  // It is ignored when any Word content/style/image part changes, so external edits are never overwritten.
  zip.file(
    templatePart,
    '<?xml version="1.0" encoding="UTF-8"?><template xmlns="' +
      templateNamespace +
      '" digest="' +
      wordDigest(zip) +
      '"><document encoding="base64">' +
      Buffer.from(JSON.stringify(document), 'utf8').toString('base64') +
      '</document></template>',
  );
  return {
    fileName: (name.trim() || '证明模板').replace(/[\\/:*?"<>|]/g, '_') + '.docx',
    contentBase64: zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }).toString('base64'),
  };
}
