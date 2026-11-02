import { fieldKeyForLabel } from '../shared/student-model';
import { certificatePreset } from '../shared/certificate-presets';
import { initialDocument, type RichNode, type RichMark, type RichDocument } from './rich-document';
import type { Template } from './data';

function englishParagraph(
  text: string,
  options: { align?: 'left' | 'right' | 'center'; title?: boolean; before?: number } = {},
): RichNode {
  const marks: RichMark[] = [
    {
      type: 'textStyle',
      attrs: { fontFamily: 'Times New Roman', fontSize: options.title ? '14pt' : '12pt' },
    },
    ...(options.title ? [{ type: 'bold' as const }] : []),
  ];
  const content: RichNode[] = text
    .split(/(\{\{[^{}]+\}\})/g)
    .filter(Boolean)
    .map((part) => {
      const key = part.startsWith('{{') ? fieldKeyForLabel(part.slice(2, -2)) : undefined;
      return key
        ? { type: 'templateField', attrs: { fieldKey: key }, marks }
        : { type: 'text', text: part, marks };
    });
  return {
    type: 'paragraph',
    attrs: {
      textAlign: options.align ?? 'left',
      lineHeight: '1.7',
      firstLineIndent: 0,
      spaceBefore: options.before ?? 0,
      spaceAfter: options.title ? 12 : 8,
    },
    content,
  };
}
export function englishSection(kind: string): RichNode[] {
  const preset = certificatePreset(kind);
  return [
    englishParagraph(preset.englishName, { align: 'center', title: true, before: 22 }),
    ...preset.englishBody.split(/\n\s*\n/).map((paragraph) => englishParagraph(paragraph)),
    englishParagraph('This certificate is hereby issued.'),
    englishParagraph('{{落款（英文）}}', { align: 'right', before: 14 }),
    englishParagraph('{{开具日期（英文）}}', { align: 'right' }),
  ];
}
export function bilingualDocument(template: Template, kind = template.kind): RichDocument {
  const chinese = initialDocument(template);
  return { ...chinese, content: [...chinese.content, ...englishSection(kind)] };
}
export function newBilingualDocument(kind = 'enrollment'): RichDocument {
  const preset = certificatePreset(kind);
  const document = bilingualDocument(
    {
      id: '',
      kind,
      name: preset.name,
      body: preset.body + '\n\n{{落款}}\n{{开具日期}}',
      format: 'text',
      requiredFields: [],
      version: 0,
      originalFileName: '',
      createdAt: '',
    },
    kind,
  );
  const heading = document.content.find((node) => node.type === 'heading');
  if (heading) {
    heading.attrs = { ...heading.attrs, spaceBefore: 24, spaceAfter: 18 };
    heading.content = [
      {
        type: 'text',
        text: preset.name,
        marks: [
          { type: 'textStyle', attrs: { fontFamily: 'SimSun', fontSize: '18pt' } },
          { type: 'bold' },
        ],
      },
    ];
  }
  return document;
}
