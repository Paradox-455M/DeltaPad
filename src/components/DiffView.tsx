import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import '../lib/monaco/setup';
import { motion } from 'framer-motion';
import hljs from 'highlight.js/lib/common';
import { detectLanguage as detectFromPath } from '../lib/monaco/language';
import { Tab } from './EditorTabs';
import { diffChars } from 'diff';

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
  const leftDecorationsCollRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const rightDecorationsCollRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const timers = useRef<{ 
    leftDecorate?: number; rightDecorate?: number;
    leftDetect?: number;   rightDetect?: number;
  }>({});

  const left = tabs.find(t => t.id === leftId) ?? tabs[0];
  const right = tabs.find(t => t.id === rightId) ?? tabs[1];

  const [leftLang, setLeftLang] = useState<string>('plaintext');
  const [rightLang, setRightLang] = useState<string>('plaintext');
  const [warning, setWarning] = useState<string | null>(null);

  const languages = useMemo(
    () => [
      'plaintext', 'json', 'javascript', 'typescript', 'html', 'css', 'scss', 'less', 'markdown',
      'yaml', 'xml', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'shell',
      'sql'
    ],
    []
  );

  /** 🔍 Smart detection: prefer file extension, then strong heuristics, then hljs with confidence, else plaintext */
  function detectLanguage(code: string, fallback: string = 'plaintext', extHint?: string, explicitLanguageHint?: string): string {
    const sample = (code || '').slice(0, 20000);
    const trimmed = sample.trim();

    // 0) Explicit hint from tab.language if provided
    if (explicitLanguageHint && explicitLanguageHint !== 'plaintext') {
      return explicitLanguageHint as string;
    }

    // 1) Prefer extension mapping if available
    if (extHint) {
      const byExt = detectFromPath(extHint);
      if (byExt && byExt !== 'plaintext') return byExt;
    }

    // 2) Strong JSON heuristic first
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && /":\s*|:\s*"/.test(trimmed)) {
      try { JSON.parse(trimmed); return 'json'; } catch {}
    }

    // 3) Strong PHP check
    if (/^<\?php/.test(trimmed) || (/\$[A-Za-z_][A-Za-z0-9_]*\b/.test(sample) && /(->|::)/.test(sample))) {
      return 'php';
    }

    // 4) Strong TypeScript heuristics
    const tsHeuristics = [
      /\bimport\s+React\b/,
      /\bexport\s+default\b/,
      /\binterface\s+[A-Za-z_][A-Za-z0-9_]*/,
      /\benum\s+[A-Za-z_][A-Za-z0-9_]*/,
      /\btype\s+[A-Za-z_][A-Za-z0-9_]*\s*=/,
      /:\s*[A-Za-z_][A-Za-z0-9_]*(<[^>]+>)?/,
    ];
    if (tsHeuristics.some(re => re.test(sample))) {
      return 'typescript';
    }

    // 5) highlight.js with confidence threshold
    const result = hljs.highlightAuto(sample);
    const map: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      html: 'html',
      xml: 'xml',
      css: 'css',
      json: 'json',
      java: 'java',
      python: 'python',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      php: 'php',
      ruby: 'ruby',
      rust: 'rust',
      shell: 'shell',
      sql: 'sql',
      plaintext: 'plaintext'
    };

    const candidate = result.language ? map[result.language] : undefined;
    const confident = typeof (result as any).relevance === 'number' ? ((result as any).relevance >= 8) : !!candidate;
    if (candidate && confident) return candidate;

    return fallback || 'plaintext';
  }

  type Side = 'left' | 'right';

  /** 📦 Apply language to Monaco + update dropdown state + format */
  const applyLanguageAndFormat = (side: Side, lang: string) => {
    const model = side === 'left' ? leftModelRef.current : rightModelRef.current;
    const editor = side === 'left' ? leftEditorRef.current : rightEditorRef.current;
    if (!model || !editor) return;

    monaco.editor.setModelLanguage(model, lang);
    if (side === 'left') setLeftLang(lang); else setRightLang(lang);

    // Clear warning if languages now match
    const newLeft = side === 'left' ? lang : leftLang;
    const newRight = side === 'right' ? lang : rightLang;
    if (newLeft === newRight) {
      setWarning(null);
      setTimeout(() => computeAndDecorate(), 0);
    }

    // small delay lets Monaco’s language service spin up
    if (['json', 'typescript', 'javascript', 'html', 'css', 'markdown'].includes(lang)) {
      requestAnimationFrame(() => {
        setTimeout(() => editor.getAction('editor.action.formatDocument')?.run(), 80);
      });
    }
  };

  /** 🧠 Detect + apply helper */
  const detectAndApply = (side: Side) => {
    const model = side === 'left' ? leftModelRef.current : rightModelRef.current;
    if (!model) return;
    const tab = side === 'left' ? left : right;
    const extHint = tab?.filePath;
    const tabLang = tab?.language;
    const detected = detectLanguage(model.getValue(), 'plaintext', extHint, tabLang);
    applyLanguageAndFormat(side, detected);
  };

  /** 📋 Unified paste handler for both keyboard and context menu */
  const handlePaste = (side: Side) => {
    requestAnimationFrame(() => {
      detectAndApply(side);
      computeAndDecorate();
    });
  };

  /** 🖌️ Compute diff and decorate (line + char changes) */
  const computeAndDecorate = () => {
    const lModel = leftModelRef.current;
    const rModel = rightModelRef.current;
    const lEditor = leftEditorRef.current;
    const rEditor = rightEditorRef.current;
    if (!lModel || !rModel || !lEditor || !rEditor) return;

    // 🚫 Guard: skip if languages differ
    if (leftLang !== rightLang) {
      // eslint-disable-next-line no-console
      console.warn('Both sides must use the same language to compare.');
      setWarning('Please set the same language on both editors before comparing.');
      return;
    }

    try {
      const leftText = lModel.getValue();
      const rightText = rModel.getValue();

      if (!leftText || !rightText) {
        leftDecorationsCollRef.current?.clear();
        rightDecorationsCollRef.current?.clear();
        console.log('[DiffView] Skipping diff, one side empty');
        return;
      }

      const diffs = diffChars(leftText, rightText);

      const summary = { added: 0, removed: 0, modified: 0 } as { added: number; removed: number; modified: number };
      for (const d of diffs) {
        if (d.added) summary.added += d.count ?? d.value.length;
        else if (d.removed) summary.removed += d.count ?? d.value.length;
      }
      summary.modified = Math.min(summary.added, summary.removed);
      // eslint-disable-next-line no-console
      console.log('[DiffView] diff summary', summary);
      // eslint-disable-next-line no-console
      console.log('[DiffView] diffs', diffs);

      const leftDecors: monaco.editor.IModelDeltaDecoration[] = [];
      const rightDecors: monaco.editor.IModelDeltaDecoration[] = [];

      let lIndex = 0;
      let rIndex = 0;
      const indexToPos = (model: monaco.editor.ITextModel, absoluteIndex: number) => {
        const pos = model.getPositionAt(absoluteIndex);
        return { line: pos.lineNumber, col: pos.column };
      };

      for (const part of diffs) {
        const text = part.value;
        const len = text.length;
        if (part.added) {
          const start = indexToPos(rModel, rIndex);
          const end = indexToPos(rModel, rIndex + len);
          rightDecors.push({ range: new monaco.Range(start.line, start.col, end.line, end.col), options: { inlineClassName: 'neon-inline-add' } });
          rightDecors.push({ range: new monaco.Range(start.line, 1, end.line, 1), options: { isWholeLine: true, className: 'neon-addition-line' } });
          rIndex += len;
        } else if (part.removed) {
          const start = indexToPos(lModel, lIndex);
          const end = indexToPos(lModel, lIndex + len);
          leftDecors.push({ range: new monaco.Range(start.line, start.col, end.line, end.col), options: { inlineClassName: 'neon-inline-del' } });
          leftDecors.push({ range: new monaco.Range(start.line, 1, end.line, 1), options: { isWholeLine: true, className: 'neon-deletion-line' } });
          lIndex += len;
        } else {
          lIndex += len;
          rIndex += len;
        }
      }

      leftDecorationsCollRef.current?.set(leftDecors);
      rightDecorationsCollRef.current?.set(rightDecors);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('[DiffView] compare failed', err);
    }
  };

  // removed old helper duplication
  

  /** init editors */
  useEffect(() => {
    const init = () => {
      if (!leftWrapRef.current || !rightWrapRef.current) return;

      monaco.editor.setTheme('synthwave-neon');

      // Initial detect
      const leftDetected = detectLanguage(left?.content ?? '', 'plaintext', left?.filePath, left?.language);
      const rightDetected = detectLanguage(right?.content ?? '', 'plaintext', right?.filePath, right?.language);
      setLeftLang(leftDetected);
      setRightLang(rightDetected);

      // Models
      const leftModel = monaco.editor.createModel(left?.content ?? '', leftDetected);
      const rightModel = monaco.editor.createModel(right?.content ?? '', rightDetected);
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

      // Use non-deprecated decorations collections
      leftDecorationsCollRef.current = leftEditor.createDecorationsCollection();
      rightDecorationsCollRef.current = rightEditor.createDecorationsCollection();

      // Disable diagnostics and clear markers (no red squiggles)
      try {
        monaco.editor.setModelMarkers(leftModel, 'owner', []);
        monaco.editor.setModelMarkers(rightModel, 'owner', []);
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({ validate: false });
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });
        monaco.languages.css.cssDefaults.setDiagnosticsOptions({ validate: false });
        // Some Monaco versions use setOptions for HTML; cast to any to avoid type issues
        (monaco.languages.html.htmlDefaults as any).setOptions?.({ validate: false });
      } catch {
        // ignore if some language defaults not present
      }

      // After creating models/editors:
      applyLanguageAndFormat('left',  leftDetected);
      applyLanguageAndFormat('right', rightDetected);

      // LEFT
      const d1 = leftEditor.onDidChangeModelContent((e) => {
        // debounce decorations
        if (timers.current.leftDecorate) clearTimeout(timers.current.leftDecorate);
        timers.current.leftDecorate = window.setTimeout(() => computeAndDecorate(), 120);

        // paste heuristic: large insert or has newline(s)
        const looksLikePaste = e.changes?.some(c => c.text.length > 2 || c.text.includes('\n'));
        if (looksLikePaste) handlePaste('left');
        else {
          // light debounce for autodetect on normal typing
          if (timers.current.leftDetect) clearTimeout(timers.current.leftDetect);
          timers.current.leftDetect = window.setTimeout(() => detectAndApply('left'), 300);
        }
      });

      // Keyboard paste (Ctrl/Cmd + V)
      const kd1 = leftEditor.onKeyDown(e => {
        // IKeyboardEvent has no 'key'; use code only
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV')) {
          handlePaste('left');
        }
      });

      // Monaco onDidPaste when available (some builds omit it)
      const p1 = (leftEditor as any).onDidPaste?.(() => handlePaste('left'));

      // RIGHT
      const d2 = rightEditor.onDidChangeModelContent((e) => {
        if (timers.current.rightDecorate) clearTimeout(timers.current.rightDecorate);
        timers.current.rightDecorate = window.setTimeout(() => computeAndDecorate(), 120);

        const looksLikePaste = e.changes?.some(c => c.text.length > 2 || c.text.includes('\n'));
        if (looksLikePaste) handlePaste('right');
        else {
          if (timers.current.rightDetect) clearTimeout(timers.current.rightDetect);
          timers.current.rightDetect = window.setTimeout(() => detectAndApply('right'), 300);
        }
      });

      const kd2 = rightEditor.onKeyDown(e => {
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV')) {
          handlePaste('right');
        }
      });

      const p2 = (rightEditor as any).onDidPaste?.(() => handlePaste('right'));

      computeAndDecorate();

      return () => {
        if (timers.current.leftDecorate)  clearTimeout(timers.current.leftDecorate);
        if (timers.current.rightDecorate) clearTimeout(timers.current.rightDecorate);
        if (timers.current.leftDetect)    clearTimeout(timers.current.leftDetect);
        if (timers.current.rightDetect)   clearTimeout(timers.current.rightDetect);

        d1.dispose();
        d2.dispose();
        kd1.dispose();
        kd2.dispose();
        p1?.dispose?.();
        p2?.dispose?.();
        leftEditor.dispose();
        rightEditor.dispose();
        leftDecorationsCollRef.current?.clear();
        rightDecorationsCollRef.current?.clear();
        leftModel.dispose();
        rightModel.dispose();
      };
    };

    const cleanup = init();
    return () => {
      if (cleanup) cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** If parent replaces tab contents, reapply value + detect/format */
  useEffect(() => {
    if (leftModelRef.current && left) {
      leftModelRef.current.setValue(left.content ?? '');
      detectAndApply('left');
      computeAndDecorate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left?.id, left?.content]);

  useEffect(() => {
    if (rightModelRef.current && right) {
      rightModelRef.current.setValue(right.content ?? '');
      detectAndApply('right');
      computeAndDecorate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [right?.id, right?.content]);

  /** If user changes dropdown language manually */
  useEffect(() => {
    if (leftModelRef.current && leftLang)
      monaco.editor.setModelLanguage(leftModelRef.current, leftLang);
  }, [leftLang]);
  useEffect(() => {
    if (rightModelRef.current && rightLang)
      monaco.editor.setModelLanguage(rightModelRef.current, rightLang);
  }, [rightLang]);

  return (
    <div className="diff-view">
  <div className="diff-toolbar">
    <div style={{ display: 'flex', gap: 12, alignItems: 'center',justifyContent:'space-between',width:'80%'}}>
      {/* Languages still selectable in toolbar */}
      <div className="lane" >
        <label className="neon-text" style={{ marginRight: 6 }}>Left</label>
        <select className="neon-select" value={leftLang} onChange={e => applyLanguageAndFormat('left', e.target.value)}>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="lane" style={{marginRight:'12%'}}>
        <label className="neon-text" style={{ marginRight: 6 }}>Right</label>
        <select className="neon-select" value={rightLang} onChange={e => applyLanguageAndFormat('right', e.target.value)}>
          {languages.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.button
        className="neon-button-compare"
        title="Compare"
        onClick={() => computeAndDecorate()}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
      >
        Compare
      </motion.button>
      <motion.button
        className="neon-close-btn"
        title="Close Diff"
        onClick={onClose}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
      >
        Close ✦
      </motion.button>
    </div>
  </div>

  <div className="diff-editor">
    {warning && (
      <div className="bg-red-600 text-white text-sm px-4 py-2 rounded mb-2">
        {warning}
      </div>
    )}
    <div className="diff-grid">
      <motion.div className="editor-glass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {/* <span className="editor-label left-label">Left</span> */}
        <div ref={leftWrapRef} className="editor-host rounded-2xl" style={{ height: '100%', minHeight: 420 }} />
      </motion.div>
      <motion.div className="editor-glass" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
        {/* <span className="editor-label right-label">Right</span> */}
        <div ref={rightWrapRef} className="editor-host rounded-2xl" style={{ height: '100%', minHeight: 420 }} />
      </motion.div>
    </div>
  </div>
</div>

  );
}
