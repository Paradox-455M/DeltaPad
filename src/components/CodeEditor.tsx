import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import '../lib/monaco/setup';
import { Tab } from './EditorTabs';
import { detectLanguage as detectLanguageFromPath, detectLanguageSmart } from '../lib/monaco/language';

export default function CodeEditor(props: {
  tab: Tab;
  wordWrap: boolean;
  onContentChange: (content: string) => void;
  onLanguageChange: (language: string) => void;
  onSave: () => void;
}) {
  const { tab, wordWrap, onContentChange, onLanguageChange, onSave } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [position, setPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 });

  const runFormatSafely = (ed: monaco.editor.IStandaloneCodeEditor) => {
    const action = ed.getAction('editor.action.formatDocument');
    // Monaco returns an IAction or a thenable; guard before calling
    if (action && typeof (action as any).run === 'function') {
      const supported = typeof (action as any).isSupported === 'function' ? (action as any).isSupported() : true;
      if (supported) (action as any).run();
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      value: tab.content,
      language: tab.language,
      theme: 'synthwave-neon',
      automaticLayout: true,
      wordWrap: wordWrap ? 'on' : 'off',
      minimap: { enabled: false },
      lineNumbers: 'on',
      folding: true,
      renderWhitespace: 'selection',
      tabSize: 2
    });
    editorRef.current = editor;

    const d1 = editor.onDidChangeModelContent((e) => {
      const value = editor.getValue();
      onContentChange(value);
      // If the buffer is valid JSON, force JSON language to avoid TS diagnostics on JSON text
      try {
        const trimmed = value.trim();
        if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
          JSON.parse(trimmed);
          const model = editor.getModel();
          const currentLang = model?.getLanguageId();
          if (model && currentLang !== 'json') {
            monaco.editor.setModelLanguage(model, 'json');
            onLanguageChange('json');
            // format after language service initializes
            requestAnimationFrame(() => setTimeout(() => runFormatSafely(editor), 80));
          }
        }
      } catch {}
      // detect language on paste or larger inserts (smart fallback)
      const looksLikePaste = e.changes?.some(c => c.text.length > 2 || c.text.includes('\n'));
      if (looksLikePaste) {
        const lang = detectLanguageSmart(value, { extHint: tab.filePath, explicitLanguageHint: tab.language, fallback: tab.language || 'plaintext' });
        if (lang !== (tab.language || 'plaintext')) {
          const model = editor.getModel();
          if (model) monaco.editor.setModelLanguage(model, lang);
          onLanguageChange(lang);
          requestAnimationFrame(() => setTimeout(() => runFormatSafely(editor), 80));
          document.dispatchEvent(new CustomEvent('status:meta', { detail: { eol: tab.eol, encoding: 'UTF-8' } }));
        }
      }
    });
    const d2 = editor.onDidChangeCursorPosition(e => {
      setPosition({ line: e.position.lineNumber, column: e.position.column });
      document.dispatchEvent(new CustomEvent('status:update', { detail: { line: e.position.lineNumber, column: e.position.column } }));
    });

    // Drag & Drop: allow any single file to replace editor contents
    const host = containerRef.current!;
    const reportError = (message: string) => alert(message);
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      if (files.length !== 1) {
        reportError('Please drop a single file.');
        return;
      }
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = typeof reader.result === 'string' ? reader.result : '';
          editor.setValue(content);
          const model = editor.getModel();
          if (model) {
            const byExt = detectLanguageFromPath(file.name);
            const lang = detectLanguageSmart(content, { extHint: file.name, explicitLanguageHint: byExt, fallback: byExt || 'plaintext' });
            monaco.editor.setModelLanguage(model, lang);
            onLanguageChange(lang);
            // format after switching language and value set
            requestAnimationFrame(() => setTimeout(() => runFormatSafely(editor), 80));
          }
        } catch (err) {
          reportError('Failed to load file content into the editor.');
          // eslint-disable-next-line no-console
          console.error(err);
        }
      };
      reader.onerror = () => {
        reportError(`Failed to read file: ${reader.error?.message ?? 'Unknown error'}`);
        // eslint-disable-next-line no-console
        console.error(reader.error);
      };
      reader.readAsText(file);
    };
    const onDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    host.addEventListener('dragenter', onDragEnter as EventListener);
    host.addEventListener('dragover', onDragOver as EventListener);
    host.addEventListener('dragleave', onDragLeave as EventListener);
    host.addEventListener('drop', onDrop as EventListener);

    const onReveal = (ev: any) => {
      const { lineNumber, column } = ev.detail ?? {};
      if (lineNumber && column) {
        editor.revealPositionInCenter({ lineNumber, column });
        editor.setPosition({ lineNumber, column });
        editor.focus();
      }
    };
    const onGoto = () => {
      editor.trigger('any', 'editor.action.gotoLine', undefined);
    };
    const onFind = () => editor.trigger('any', 'actions.find', undefined);
    const onReplace = () => editor.trigger('any', 'editor.action.startFindReplaceAction', undefined);

    const r = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSave();
      }
    };

    document.addEventListener('editor:reveal', onReveal as EventListener);
    document.addEventListener('editor:gotoLine', onGoto as EventListener);
    document.addEventListener('keydown', r);
    document.addEventListener('editor:find', onFind as EventListener);
    document.addEventListener('editor:replace', onReplace as EventListener);

    return () => {
      d1.dispose();
      d2.dispose();
      host.removeEventListener('dragenter', onDragEnter as EventListener);
      host.removeEventListener('dragover', onDragOver as EventListener);
      host.removeEventListener('dragleave', onDragLeave as EventListener);
      host.removeEventListener('drop', onDrop as EventListener);
      document.removeEventListener('editor:reveal', onReveal as EventListener);
      document.removeEventListener('editor:gotoLine', onGoto as EventListener);
      document.removeEventListener('keydown', r);
      document.removeEventListener('editor:find', onFind as EventListener);
      document.removeEventListener('editor:replace', onReplace as EventListener);
      // Note: do NOT dispose Monaco on unmount while panel overlays, to avoid DOM removal order issues.
      editor.dispose();
    };
  }, [tab.id]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' });
    }
  }, [wordWrap]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== tab.content) {
      const model = editorRef.current.getModel();
      if (model) monaco.editor.getModel(model.uri)?.setValue(tab.content);
    }
  }, [tab.content]);

  useEffect(() => {
    document.dispatchEvent(new CustomEvent('status:meta', { detail: { eol: tab.eol, encoding: 'UTF-8' } }));
  }, [tab.eol]);

  return (
    <div className="editor-container" style={{ width: '100%',height:'100%',minHeight:'fit-content' }}>
      <div ref={containerRef} className="editor-host" />
    </div>
  );
}

