import { useEffect, useRef } from 'react';
import {
  Annotation,
  Compartment,
  EditorState,
  Transaction,
  type Extension,
} from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  type Language,
} from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { tags } from '@lezer/highlight';

const externalUpdate = Annotation.define<boolean>();
const syntaxColors = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: '#cf222e' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: '#0a3069' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#0550ae' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#8250df' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#953800' },
  { tag: [tags.tagName, tags.angleBracket], color: '#116329' },
  { tag: [tags.propertyName, tags.attributeName], color: '#0550ae' },
  { tag: [tags.operator, tags.punctuation], color: '#57606a' },
  { tag: tags.comment, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.heading, color: '#0550ae', fontWeight: '600' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: '#0969da', textDecoration: 'underline' },
  { tag: tags.monospace, color: '#0a3069' },
  { tag: tags.invalid, color: '#cf222e', textDecoration: 'underline wavy #cf222e' },
]);

const codeTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      minHeight: '0',
      backgroundColor: '#ffffff',
      color: '#24292f',
      fontSize: '13px',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'Consolas,"Cascadia Code","SFMono-Regular",Menlo,"Microsoft YaHei",monospace',
      lineHeight: '1.8',
      minHeight: '0',
      overflow: 'auto',
      overscrollBehavior: 'contain',
    },
    '.cm-content': { padding: '18px 0', caretColor: '#24292f', minHeight: '100%' },
    '.cm-line': { padding: '0 20px 0 14px' },
    '.cm-gutters': {
      backgroundColor: '#fafbfc',
      color: '#9aa3af',
      border: 'none',
      borderRight: '1px solid #edf0f3',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 9px 0 14px', minWidth: '42px' },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 5px', color: '#9aa3af' },
    '.cm-activeLine': { backgroundColor: '#f6f8fa' },
    '.cm-activeLineGutter': { backgroundColor: '#eef2f6', color: '#57606a' },
    '&.cm-focused .cm-selectionBackground,.cm-selectionBackground,::selection': {
      backgroundColor: '#dcecff',
    },
    '.cm-selectionMatch': { backgroundColor: '#e5f1ff' },
    '&.cm-focused .cm-cursor': { borderLeftColor: '#24292f' },
    '.cm-matchingBracket': { backgroundColor: '#ddf4e5', outline: '1px solid #a9d9b8' },
    '.cm-nonmatchingBracket': { backgroundColor: '#ffebe9' },
    '.cm-foldPlaceholder': {
      color: '#7c858f',
      backgroundColor: '#f1f3f5',
      border: '1px solid #e3e7ec',
      borderRadius: '4px',
      padding: '0 5px',
    },
    '.cm-panels': {
      backgroundColor: '#f8fafb',
      color: '#57606a',
      fontFamily: '"Segoe UI","Microsoft YaHei",sans-serif',
      fontSize: '12px',
    },
    '.cm-panels-top': { borderBottom: '1px solid #e7ebef' },
    '.cm-panels-bottom': { borderTop: '1px solid #e7ebef' },
    '.cm-search': { padding: '8px 12px' },
    '.cm-textfield': {
      border: '1px solid #dce2e9',
      borderRadius: '5px',
      backgroundColor: '#fff',
      padding: '4px 7px',
    },
    '.cm-button': {
      border: '1px solid #dce2e9',
      borderRadius: '5px',
      backgroundImage: 'none',
      backgroundColor: '#fff',
      color: '#57606a',
      padding: '3px 8px',
      fontSize: '11px',
    },
  },
  { dark: false },
);

function fencedLanguage(info: string): Language | null {
  const name = info.trim().split(/\s+/)[0]?.toLowerCase();
  if (name === 'tsx') return javascript({ typescript: true, jsx: true }).language;
  if (name === 'ts' || name === 'typescript') return javascript({ typescript: true }).language;
  if (name === 'jsx') return javascript({ jsx: true }).language;
  if (name === 'js' || name === 'javascript') return javascript().language;
  if (name === 'json') return json().language;
  if (name === 'css') return css().language;
  return null;
}

function languageFor(path: string): Extension {
  if (/\.tsx$/i.test(path)) return javascript({ typescript: true, jsx: true });
  if (/\.(ts|mts|cts)$/i.test(path)) return javascript({ typescript: true });
  if (/\.jsx$/i.test(path)) return javascript({ jsx: true });
  if (/\.(js|mjs|cjs)$/i.test(path)) return javascript();
  if (/\.json$/i.test(path)) return json();
  if (/\.css$/i.test(path)) return css();
  if (/\.(md|markdown)$/i.test(path)) return markdown({ codeLanguages: fencedLanguage });
  return [];
}

interface Props {
  path: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

export default function SourceCodeEditor({
  path,
  value,
  disabled = false,
  onChange,
  onSave,
}: Props) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    access = useRef(new Compartment());
  const callbacks = useRef({ onChange, onSave, disabled });
  callbacks.current = { onChange, onSave, disabled };

  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          foldGutter(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          EditorState.lineSeparator.of(value.includes('\r\n') ? '\r\n' : '\n'),
          languageFor(path),
          syntaxHighlighting(syntaxColors),
          codeTheme,
          access.current.of([EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)]),
          EditorView.contentAttributes.of({
            'aria-label': '服务器源码内容',
            'aria-multiline': 'true',
            spellcheck: 'false',
            autocapitalize: 'off',
            autocorrect: 'off',
          }),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                if (!callbacks.current.disabled) callbacks.current.onSave();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...foldKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((transaction) => transaction.annotation(externalUpdate))
            )
              callbacks.current.onChange(update.state.sliceDoc());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      if (view.current === editor) view.current = null;
      editor.destroy();
    };
  }, [path]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.sliceDoc() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: [externalUpdate.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({
      effects: access.current.reconfigure([
        EditorState.readOnly.of(disabled),
        EditorView.editable.of(!disabled),
      ]),
    });
  }, [disabled]);

  return (
    <div
      ref={host}
      className="server-source-code"
      data-language={path.split('.').at(-1)?.toLowerCase() ?? 'text'}
    />
  );
}
