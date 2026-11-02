import PizZip from 'pizzip';
import { DOMParser, XMLSerializer, type Element } from '@xmldom/xmldom';
import { dateFields, fields, formatDate } from './definitions.js';
import { englishValue, isEnglishText } from '../shared/bilingual.js';
import { fieldKeyForLabel } from '../shared/student-model.js';
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
/** Only Word content parts can carry placeholders; styles/settings never do. */
const skip =
  /^word\/(styles|stylesWithEffects|settings|numbering|webSettings|fontTable|theme[^/]*|_rels\/.*)\.xml$/;
type Segment =
  | { kind: 'text'; start: number; end: number }
  | { kind: 'value'; at: number; text: string };
function parse(value: string) {
  return new DOMParser({
    onError: () => {
      throw new Error('Invalid document XML');
    },
  }).parseFromString(value, 'application/xml');
}
function writeText(node: Element, value: string) {
  while (node.firstChild) node.removeChild(node.firstChild);
  if (value) node.appendChild(node.ownerDocument!.createTextNode(value));
  node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
}
/** Replace {{字段}} in one paragraph; English paragraphs receive English values field by field. */
function replaceParagraph(paragraph: Element, data: Record<string, string>) {
  const nodes = Array.from(paragraph.getElementsByTagNameNS(W, 't'));
  if (!nodes.length) return false;
  const offsets: number[] = [];
  let text = '';
  for (const node of nodes) {
    offsets.push(text.length);
    text += node.textContent ?? '';
  }
  offsets.push(text.length);
  const matches = [...text.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].filter(
    (match) => !!fieldKeyForLabel(match[1]!),
  );
  if (!matches.length) return false;
  const english = isEnglishText(text),
    segments: Segment[] = [];
  let cursor = 0;
  for (const match of matches) {
    const key = fieldKeyForLabel(match[1]!)!,
      raw = data[key] ?? '',
      value = english ? englishValue(key, raw, data) : dateFields.has(key) ? formatDate(raw) : raw,
      start = match.index ?? cursor,
      end = start + match[0].length;
    if (start > cursor) segments.push({ kind: 'text', start: cursor, end: start });
    segments.push({ kind: 'value', at: start, text: value });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ kind: 'text', start: cursor, end: text.length });
  for (let i = 0; i < nodes.length; i++) {
    const from = offsets[i]!,
      to = offsets[i + 1]!;
    let output = '';
    for (const segment of segments) {
      if (segment.kind === 'text') {
        const start = Math.max(segment.start, from),
          end = Math.min(segment.end, to);
        if (end > start) output += text.slice(start, end);
      } else if (segment.at >= from && segment.at < to) output += segment.text;
    }
    writeText(nodes[i]!, output);
  }
  return true;
}
/**
 * docx rendering with bilingual awareness: paragraphs written in English get English field values,
 * Chinese paragraphs keep the existing Chinese formatting of dates and terms.
 */
export function renderBilingualDocx(content: Buffer, data: Record<string, string>) {
  const zip = new PizZip(content);
  const written = new Map<string, string>();
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name]!.dir || !name.startsWith('word/') || !name.endsWith('.xml')) continue;
    if (skip.test(name)) continue;
    const file = zip.file(name);
    if (!file) continue;
    const source = file.asText();
    if (!source.includes('{{')) continue;
    const document = parse(source);
    let touched = false;
    for (const paragraph of Array.from(document.getElementsByTagNameNS(W, 'p')))
      if (replaceParagraph(paragraph as Element, data)) touched = true;
    if (!touched) continue;
    const output = new XMLSerializer().serializeToString(document);
    zip.file(name, output);
    written.set(name, output);
  }
  if (!written.size) throw new Error('No fields rendered');
  /** Re-open the result: a broken serialisation or a missing field must never reach a certificate. */
  const check = new PizZip(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  for (const [name, expected] of written) {
    const actual = check.file(name)?.asText() ?? '';
    if (actual !== expected.substring(0, expected.length)) throw new Error('Document part missing');
    parse(actual);
    for (const match of actual.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g))
      if (fieldKeyForLabel(match[1]!)) throw new Error('Unrendered field');
  }
  return check.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}
