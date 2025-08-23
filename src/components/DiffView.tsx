import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import '../lib/monaco/setup';
import { motion } from 'framer-motion';
import { Tab } from './EditorTabs';

export default function DiffView(props: {
  tabs: Tab[];
  leftId?: string;
  rightId?: string;
  onSelect: (leftId?: string, rightId?: string) => void;
  onClose: () => void;
}) {
  const { tabs, leftId, rightId, onClose } = props;

  const leftWrapRef = useRef<HTMLDivElement | null>(null);
  const rightWrapRef = useRef<HTMLDivElement | null>(null);
  const leftEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const rightEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const leftModelRef = useRef<monaco.editor.ITextModel | null>(null);
  const rightModelRef = useRef<monaco.editor.ITextModel | null>(null);
  const leftDecorationsRef = useRef<string[]>([]);
  const rightDecorationsRef = useRef<string[]>([]);
  const debounceTimer = useRef<number | undefined>(undefined);

  const left = tabs.find(t => t.id === leftId) ?? tabs[0];
  const right = tabs.find(t => t.id === rightId) ?? tabs[1];

  const [leftLang, setLeftLang] = useState<string>(left?.language || 'plaintext');
  const [rightLang, setRightLang] = useState<string>(right?.language || 'plaintext');

  const languages = useMemo(() => ([
    'plaintext', 'json', 'javascript', 'typescript', 'html', 'css', 'scss', 'less', 'markdown',
    'yaml', 'xml', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'shell',
    'sql'
  ]), []);

  const computeAndDecorate = async () => {
    if (!leftModelRef.current || !rightModelRef.current || !leftEditorRef.current || !rightEditorRef.current) return;
    try {
      const result = await (monaco.editor as any).computeDiff(leftModelRef.current, rightModelRef.current, {
        ignoreTrimWhitespace: false,
        maxComputationTime: 1500
      });
      const changes = result?.changes ?? [];

      const leftDecors: monaco.editor.IModelDeltaDecoration[] = [];
      const rightDecors: monaco.editor.IModelDeltaDecoration[] = [];

      for (const c of changes) {
        const oStart = Math.max(1, c.original.startLineNumber);
        const oEnd = Math.max(oStart, c.original.endLineNumber);
        const mStart = Math.max(1, c.modified.startLineNumber);
        const mEnd = Math.max(mStart, c.modified.endLineNumber);

        if (oEnd >= oStart) {
          leftDecors.push({
            range: new monaco.Range(oStart, 1, oEnd, 1),
            options: {
              isWholeLine: true,
              className: 'neon-deletion-line',
              linesDecorationsClassName: 'neon-deletion-gutter'
            }
          });
        }
        if (mEnd >= mStart) {
          rightDecors.push({
            range: new monaco.Range(mStart, 1, mEnd, 1),
            options: {
              isWholeLine: true,
              className: 'neon-addition-line',
              linesDecorationsClassName: 'neon-addition-gutter'
            }
          });
        }
      }

      leftDecorationsRef.current = leftEditorRef.current.deltaDecorations(leftDecorationsRef.current, leftDecors);
      rightDecorationsRef.current = rightEditorRef.current.deltaDecorations(rightDecorationsRef.current, rightDecors);
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    const init = () => {
      if (!leftWrapRef.current || !rightWrapRef.current) return;

      monaco.editor.setTheme('synthwave-neon');

      // Models
      const leftModel = monaco.editor.createModel(left?.content ?? '', leftLang || left?.language || 'plaintext');
      const rightModel = monaco.editor.createModel(right?.content ?? '', rightLang || right?.language || 'plaintext');
      leftModelRef.current = leftModel;
      rightModelRef.current = rightModel;

      // Editors
      const leftEditor = monaco.editor.create(leftWrapRef.current, {
        model: leftModel,
        theme: 'synthwave-neon',
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        folding: true,
        renderWhitespace: 'selection',
        tabSize: 2
      });
      const rightEditor = monaco.editor.create(rightWrapRef.current, {
        model: rightModel,
        theme: 'synthwave-neon',
        automaticLayout: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        folding: true,
        renderWhitespace: 'selection',
        tabSize: 2
      });

      leftEditorRef.current = leftEditor;
      rightEditorRef.current = rightEditor;

      const onChange = () => {
        if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - setTimeout returns number in browsers
        debounceTimer.current = window.setTimeout(() => {
          computeAndDecorate();
        }, 150);
      };

      const d1 = leftEditor.onDidChangeModelContent(onChange);
      const d2 = rightEditor.onDidChangeModelContent(onChange);

      // Initial compute
      computeAndDecorate();

      return () => {
        d1.dispose();
        d2.dispose();
        if (leftEditorRef.current) leftEditorRef.current.dispose();
        if (rightEditorRef.current) rightEditorRef.current.dispose();
        if (leftModelRef.current) leftModelRef.current.dispose();
        if (rightModelRef.current) rightModelRef.current.dispose();
      };
    };

    const cleanup = init();
    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (leftModelRef.current && left) {
      const current = leftModelRef.current.getValue();
      if (current !== (left.content ?? '')) {
        leftModelRef.current.setValue(left.content ?? '');
        computeAndDecorate();
      }
    }
  }, [left?.id, left?.content]);

  useEffect(() => {
    if (rightModelRef.current && right) {
      const current = rightModelRef.current.getValue();
      if (current !== (right.content ?? '')) {
        rightModelRef.current.setValue(right.content ?? '');
        computeAndDecorate();
      }
    }
  }, [right?.id, right?.content]);

  useEffect(() => {
    if (leftModelRef.current && leftLang) {
      monaco.editor.setModelLanguage(leftModelRef.current, leftLang);
      computeAndDecorate();
    }
  }, [leftLang]);

  useEffect(() => {
    if (rightModelRef.current && rightLang) {
      monaco.editor.setModelLanguage(rightModelRef.current, rightLang);
      computeAndDecorate();
    }
  }, [rightLang]);

  return (
    <div className="diff-view neon-bg">
      <div className="diff-toolbar neon-toolbar">
        <div className="lane">
          <label className="neon-text" style={{ marginRight: 6 }}>Left</label>
          <select className="neon-select" value={leftLang} onChange={e => setLeftLang(e.target.value)}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="lane">
          <label className="neon-text" style={{ marginRight: 6 }}>Right</label>
          <select className="neon-select" value={rightLang} onChange={e => setRightLang(e.target.value)}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="spacer" />
        <motion.button
          className="neon-button"
          title="Close Diff"
          onClick={onClose}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
        >
          ×
        </motion.button>
      </div>
      <div className="diff-editor">
        <div className="diff-grid">
          <motion.div
            className="editor-glass"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div ref={leftWrapRef} className="editor-host rounded-2xl" />
          </motion.div>
          <motion.div
            className="editor-glass"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <div ref={rightWrapRef} className="editor-host rounded-2xl" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

