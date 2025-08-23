// Ensure Monaco web workers are available under Vite/Electron
// Vite will bundle these with the ?worker suffix
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as monaco from 'monaco-editor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalScope: any = self as any;
globalScope.MonacoEnvironment = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getWorker(_: string, label: string) {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  }
};


// Define a Synthwave/Neon Monaco theme once for the app
try {
  monaco.editor.defineTheme('synthwave-neon', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'E5E7EB' },
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'string', foreground: '72f1b8' },
      { token: 'number', foreground: '4cc9f0' },
      { token: 'keyword', foreground: 'ff77e9' },
      { token: 'type.identifier', foreground: '4cc9f0' },
      { token: 'delimiter', foreground: 'E5E7EB' }
    ],
    colors: {
      'editor.background': '#0b0f16',
      'editor.foreground': '#E5E7EB',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#ffffff',
      'editorCursor.foreground': '#ff77e9',
      'editor.selectionBackground': '#2a1a4a',
      'editor.selectionHighlightBackground': '#2a1a4aAA',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorIndentGuide.activeBackground': '#4cc9f044',
      'editorWidget.background': '#0f172a',
      'scrollbarSlider.background': '#ffffff22',
      'scrollbarSlider.hoverBackground': '#ffffff33',
      'scrollbarSlider.activeBackground': '#ffffff44',
      'editorGutter.addedBackground': '#72f1b866',
      'editorGutter.deletedBackground': '#ff537099',
      'editorGutter.modifiedBackground': '#4cc9f099'
    }
  });
  monaco.editor.setTheme('synthwave-neon');
} catch {
  // ignore if monaco not ready in some environments
}
