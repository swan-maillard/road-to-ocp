import { EditorState, Compartment, Prec } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

const lightTheme = EditorView.theme({
  '&': { backgroundColor: '#f7f5ef', color: '#1d2739' },
  '.cm-gutters': { backgroundColor: '#f0ede4', color: '#8b93a1', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#efeadd' },
  '.cm-activeLineGutter': { backgroundColor: '#efeadd' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#e3d9bf' },
});

const themeComp = new Compartment();

function baseExtensions({ editable, onRun, theme }) {
  const ex = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
    java(),
    themeComp.of(theme === 'light' ? lightTheme : oneDark),
  ];
  if (editable && onRun) {
    ex.push(Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => { onRun(); return true; } },
      { key: 'Ctrl-Enter', run: () => { onRun(); return true; } },
    ])));
  }
  if (!editable) ex.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  return ex;
}

export function createReadOnly({ parent, doc, theme }) {
  return new EditorView({ doc, extensions: [...baseExtensions({ editable: false, theme }), EditorView.lineWrapping], parent });
}

export function createEditable({ parent, doc, theme, onRun, onChange }) {
  const view = new EditorView({
    doc,
    extensions: [
      ...baseExtensions({ editable: true, onRun, theme }),
      EditorView.updateListener.of((u) => { if (u.docChanged && onChange) onChange(u.state.doc.toString()); }),
    ],
    parent,
  });
  return view;
}

export function setTheme(view, theme) {
  view.dispatch({ effects: themeComp.reconfigure(theme === 'light' ? lightTheme : oneDark) });
}
export const getDoc = (view) => view.state.doc.toString();
export const setDoc = (view, text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
export const destroy = (view) => { try { view.destroy(); } catch {} };
