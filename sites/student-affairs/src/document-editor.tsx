import { useEffect, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { Extension, Node, mergeAttributes, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import ImageExtension from '@tiptap/extension-image';
import { fields } from './data';
import {
  fontChoices,
  initialDocument,
  type RichDocument,
  type RichMark,
  type RichNode,
} from './rich-document';
import type { Template } from './data';
import { Icon } from './components';
const Field = Node.create({
  name: 'templateField',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      fieldKey: {
        default: 'name',
        parseHTML: (element) => element.getAttribute('data-template-field'),
        renderHTML: (attributes) => ({ 'data-template-field': attributes['fieldKey'] }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-template-field]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'template-variable', contenteditable: 'false' }),
      fields[String(node.attrs['fieldKey'])] ?? String(node.attrs['fieldKey']),
    ];
  },
  renderText({ node }) {
    return '{{' + (fields[String(node.attrs['fieldKey'])] ?? String(node.attrs['fieldKey'])) + '}}';
  },
});
const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (a) =>
              a['lineHeight'] ? { style: 'line-height:' + String(a['lineHeight']) } : {},
          },
          firstLineIndent: {
            default: 0,
            parseHTML: (element) => (element.style.textIndent === '2em' ? 2 : 0),
            renderHTML: (a) => ({
              style: 'text-indent:' + String(a['firstLineIndent'] ?? 0) + 'em',
            }),
          },
          spaceBefore: {
            default: 0,
            parseHTML: (element) => parseFloat(element.style.marginTop) || 0,
            renderHTML: (a) => ({ style: 'margin-top:' + String(a['spaceBefore'] ?? 0) + 'pt' }),
          },
          spaceAfter: {
            default: 12,
            parseHTML: (element) => parseFloat(element.style.marginBottom) || 12,
            renderHTML: (a) => ({ style: 'margin-bottom:' + String(a['spaceAfter'] ?? 12) + 'pt' }),
          },
        },
      },
    ];
  },
});
function color(value: string) {
  if (/^#[a-f\d]{6}$/i.test(value)) return value;
  const m = /^rgb\(\s*(\d+)\D+(\d+)\D+(\d+)\s*\)$/.exec(value);
  return m
    ? '#' +
        m
          .slice(1)
          .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0'))
          .join('')
    : '#20252e';
}
export function editorDocument(editor: Editor): RichDocument {
  const convert = (n: JSONContent): RichNode => {
    const out: RichNode = { type: n.type as RichNode['type'] };
    if (n.text !== undefined) out.text = n.text;
    if (n.attrs) {
      const a: NonNullable<RichNode['attrs']> = {};
      for (const [key, v] of Object.entries(n.attrs)) {
        if (v === undefined || v === null) continue;
        if (['textAlign', 'lineHeight', 'fieldKey', 'src', 'alt', 'title'].includes(key))
          (a as Record<string, unknown>)[key] = v;
        else if (
          [
            'firstLineIndent',
            'spaceBefore',
            'spaceAfter',
            'level',
            'start',
            'width',
            'height',
            'colspan',
            'rowspan',
          ].includes(key)
        )
          (a as Record<string, unknown>)[key] = Number(v);
      }
      if (Array.isArray(n.attrs['colwidth']))
        a.colwidth = n.attrs['colwidth'].map(Number).filter((v) => Number.isInteger(v) && v > 0);
      if (Object.keys(a).length) out.attrs = a;
    }
    if (n.marks?.length)
      out.marks = n.marks.map((m) => {
        const mark: RichMark = { type: m.type as RichMark['type'] };
        if (m.attrs) {
          const a: NonNullable<RichMark['attrs']> = {};
          if (m.attrs['fontFamily']) {
            const family = String(m.attrs['fontFamily'])
              .split(',')[0]!
              .trim()
              .replaceAll('"', '')
              .replaceAll("'", '');
            a.fontFamily =
              fontChoices.find(([k, label]) => k === family || label === family)?.[0] ?? 'SimSun';
          }
          if (m.attrs['fontSize']) {
            const size = String(m.attrs['fontSize']);
            a.fontSize = size.endsWith('px')
              ? parseFloat(size) * 0.75 + 'pt'
              : size.endsWith('pt')
                ? size
                : parseFloat(size) + 'pt';
          }
          if (m.attrs['color']) a.color = color(String(m.attrs['color']));
          if (Object.keys(a).length) mark.attrs = a;
        }
        return mark;
      });
    if (n.content) out.content = n.content.map(convert);
    return out;
  };
  return {
    schemaVersion: '1.0',
    type: 'doc',
    content: (editor.getJSON().content ?? []).map(convert),
  };
}
export function DocumentEditor({
  template,
  disabled,
  onReady,
}: {
  template: Template;
  disabled: boolean;
  onReady: (editor: Editor) => void;
}) {
  const [, redraw] = useState(0),
    editor = useEditor({
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          link: false,
          heading: { levels: [1, 2, 3] },
        }),
        TextStyleKit.configure({ backgroundColor: false, lineHeight: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ParagraphFormat,
        Field,
        TableKit.configure({ table: { resizable: true } }),
        ImageExtension.configure({ inline: true, allowBase64: true }),
      ],
      content: initialDocument(template) as JSONContent,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'document-content word-editor-content',
          'aria-label': '证明正文编辑器',
          spellcheck: 'false',
        },
      },
      onTransaction: () => redraw((n) => n + 1),
    });
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  if (!editor) return null;
  const attributes = editor.getAttributes('textStyle') as {
      fontFamily?: string;
      fontSize?: string;
      color?: string;
    },
    paragraph = (
      editor.isActive('heading')
        ? editor.getAttributes('heading')
        : editor.getAttributes('paragraph')
    ) as { textAlign?: string; lineHeight?: string; firstLineIndent?: number; spaceAfter?: number };
  const block = (attrs: Record<string, unknown>) =>
    editor
      .chain()
      .focus()
      .updateAttributes('paragraph', attrs)
      .updateAttributes('heading', attrs)
      .run();
  return (
    <div className="document-editor">
      <div className="document-toolbar" role="toolbar" aria-label="正文格式">
        <div className="toolbar-group">
          <button
            type="button"
            aria-label="撤销"
            title="撤销 Ctrl+Z"
            disabled={disabled || !editor.can().undo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            aria-label="重做"
            title="重做 Ctrl+Y"
            disabled={disabled || !editor.can().redo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </div>
        <div className="toolbar-group">
          <select
            aria-label="字体"
            value={attributes.fontFamily ?? 'SimSun'}
            disabled={disabled}
            onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          >
            {fontChoices.map(([font, label]) => (
              <option key={font} value={font}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="字号"
            className="font-size-select"
            value={attributes.fontSize ?? '12pt'}
            disabled={disabled}
            onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
          >
            {[
              ['9pt', '小五 · 9'],
              ['10.5pt', '五号 · 10.5'],
              ['12pt', '小四 · 12'],
              ['14pt', '四号 · 14'],
              ['16pt', '三号 · 16'],
              ['18pt', '小二 · 18'],
              ['22pt', '二号 · 22'],
              ['24pt', '小一 · 24'],
              ['26pt', '一号 · 26'],
              ['32pt', '32 磅'],
            ].map(([size, label]) => (
              <option key={size} value={size}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          {(['bold', 'italic', 'underline'] as const).map((mark) => (
            <button
              type="button"
              disabled={disabled}
              key={mark}
              className={editor.isActive(mark) ? 'active' : ''}
              aria-label={{ bold: '加粗', italic: '斜体', underline: '下划线' }[mark]}
              title={
                { bold: '加粗 Ctrl+B', italic: '斜体 Ctrl+I', underline: '下划线 Ctrl+U' }[mark]
              }
              aria-pressed={editor.isActive(mark)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleMark(mark).run()}
            >
              {mark === 'bold' ? <b>B</b> : mark === 'italic' ? <i>I</i> : <u>U</u>}
            </button>
          ))}
          <label className="text-color" title="文字颜色">
            <span style={{ color: attributes.color ?? '#20252e' }}>A</span>
            <input
              type="color"
              aria-label="文字颜色"
              value={color(attributes.color ?? '#20252e')}
              disabled={disabled}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
        </div>
        <div className="toolbar-group">
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <button
              type="button"
              key={align}
              disabled={disabled}
              title={
                { left: '左对齐', center: '居中', right: '右对齐', justify: '两端对齐' }[align]
              }
              aria-label={
                { left: '左对齐', center: '居中', right: '右对齐', justify: '两端对齐' }[align]
              }
              className={paragraph.textAlign === align ? 'active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setTextAlign(align).run()}
            >
              <span className={'alignment-icon align-' + align}>
                <i />
                <i />
                <i />
                <i />
              </span>
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <select
            aria-label="行距"
            title="行距"
            value={paragraph.lineHeight ?? '2'}
            disabled={disabled}
            onChange={(e) => block({ lineHeight: e.target.value })}
          >
            {['1', '1.15', '1.5', '1.75', '2', '2.5', '3'].map((v) => (
              <option key={v} value={v}>
                {v} 倍行距
              </option>
            ))}
          </select>
          <button
            type="button"
            className={paragraph.firstLineIndent === 2 ? 'active' : ''}
            title="首行缩进两字"
            aria-label="首行缩进两字"
            aria-pressed={paragraph.firstLineIndent === 2}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => block({ firstLineIndent: paragraph.firstLineIndent === 2 ? 0 : 2 })}
          >
            首行缩进
          </button>
          <select
            aria-label="段后间距"
            value={String(paragraph.spaceAfter ?? 12)}
            disabled={disabled}
            onChange={(e) => block({ spaceAfter: Number(e.target.value) })}
          >
            {[0, 6, 12, 16, 24, 32].map((v) => (
              <option key={v} value={v}>
                段后 {v} 磅
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="document-ruler" aria-hidden="true">
        <span>A4</span>
        <div />
      </div>
      <div className="document-editor-stage">
        <div className="document-sheet">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="document-editor-status">
        <span>
          <Icon name="certificate" size={13} />
          A4 · 210 × 297 mm
        </span>
        <span>选中文字调整格式</span>
      </div>
    </div>
  );
}
