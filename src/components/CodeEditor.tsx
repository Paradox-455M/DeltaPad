import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import '../lib/monaco/setup';
import { Tab } from './EditorTabs';

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
      // detect language on paste or larger inserts
      const looksLikePaste = e.changes?.some(c => c.text.length > 2 || c.text.includes('\n'));
      if (looksLikePaste) {
        // Let DiffView's detection logic be reused via a minimal heuristic here
        const sample = value.slice(0, 20000).trim();
        let lang: string = tab.language || 'plaintext';
        try {
          if ((sample.startsWith('{') || sample.startsWith('[')) && /":\s*|:\s*"/.test(sample)) { JSON.parse(sample); lang = 'json'; }
        } catch {}
        if (lang === (tab.language || 'plaintext')) {
          // lightweight hints
          if (/^<\?php/.test(sample)) lang = 'php';
          else if ([/\bimport\s+React\b/,/\bexport\s+default\b/,/\binterface\s+/,/\benum\s+/,/:\s*[A-Za-z_]/].some(r => r.test(sample))) lang = 'typescript';
        }
        if (lang !== (tab.language || 'plaintext')) {
          const model = editor.getModel();
          if (model) monaco.editor.setModelLanguage(model, lang);
          onLanguageChange(lang);
          requestAnimationFrame(() => setTimeout(() => editor.getAction('editor.action.formatDocument')?.run(), 80));
          document.dispatchEvent(new CustomEvent('status:meta', { detail: { eol: tab.eol, encoding: 'UTF-8' } }));
        }
      }
    });
    const d2 = editor.onDidChangeCursorPosition(e => {
      setPosition({ line: e.position.lineNumber, column: e.position.column });
      document.dispatchEvent(new CustomEvent('status:update', { detail: { line: e.position.lineNumber, column: e.position.column } }));
    });

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

