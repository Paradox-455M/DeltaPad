import hljs from 'highlight.js/lib/common';

export function detectLanguage(filePath?: string): string {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'jsx': return 'javascript';
    case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    case 'yml':
    case 'yaml': return 'yaml';
    case 'xml': return 'xml';
    case 'sh': return 'shell';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'c': return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx': return 'cpp';
    default: return 'plaintext';
  }
}

/** Smart content-based language detection with fallbacks to extension and explicit hint. */
export function detectLanguageSmart(
  code: string,
  opts?: { extHint?: string; explicitLanguageHint?: string; fallback?: string }
): string {
  const sample = (code || '').slice(0, 20000);
  const trimmed = sample.trim();
  const fallback = opts?.fallback ?? 'plaintext';

  // 0) Treat explicit hint as a soft fallback, not a hard override
  const softHint = opts?.explicitLanguageHint && opts.explicitLanguageHint !== 'plaintext'
    ? opts.explicitLanguageHint
    : undefined;

  // 1) Prefer extension mapping if available
  if (opts?.extHint) {
    const byExt = detectLanguage(opts.extHint);
    if (byExt && byExt !== 'plaintext') return byExt;
  }

  // 1.1) Shebangs
  if (/^#!.*\b(node|deno)\b/.test(sample)) return 'javascript';
  if (/^#!.*\bpython[0-9.]*\b/.test(sample)) return 'python';
  if (/^#!.*\b(bash|sh|zsh|ksh)\b/.test(sample)) return 'shell';
  if (/^#!.*\bphp\b/.test(sample)) return 'php';

  // 2) Strong JSON heuristic first
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && /":\s*|:\s*"/.test(trimmed)) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }

  // 2.25) HTML vs XML disambiguation
  const looksLikeXml = /^\s*<\?xml\b/i.test(trimmed) || /\bxmlns[:=]/i.test(sample);
  const looksLikeHtml = /<!DOCTYPE\s+html/i.test(sample) || /<html\b/i.test(sample) || /<(head|body|div|span|script|link|meta|style|section|article|nav|footer|header)\b/i.test(sample);
  if (looksLikeHtml && !looksLikeXml) return 'html';
  if (looksLikeXml && !looksLikeHtml) return 'xml';

  // 2.5) YAML heuristic (keys with colons, lists, or front-matter) but avoid JSON/JS
  const yamlIndicators = (
    /^---\s*$/.test(trimmed.split(/\r?\n/, 1)[0] || '') ||
    /\n\s*[-?]\s+[^\s]/.test(sample) ||
    /^(?:[ \t]*[A-Za-z_][\w-]*\s*:\s*[^\n]*)+(\n|$)/m.test(sample)
  );
  const hasBraces = /[{}]/.test(sample);
  if (yamlIndicators && !hasBraces) {
    return 'yaml';
  }

  // 2.6) Markdown
  if (/^#\s+/.test(trimmed) || /\n##\s+/.test(sample) || /\n-\s+/.test(sample) || /\n\*\s+/.test(sample) || /```[A-Za-z0-9_-]*\n/.test(sample) || /\[[^\]]+\]\([^\)]+\)/.test(sample)) {
    return 'markdown';
  }

  // 2.7) SQL
  if (/(^|\n)\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b[\s\S]*?\bFROM\b/i.test(sample)) {
    return 'sql';
  }

  // 2.8) CSS / SCSS / LESS
  if (/\b@[A-Za-z-]+\s*:\s*[^;]+;/.test(sample) || /\$[A-Za-z-]+:\s*[^;]+;/.test(sample) || /@mixin\b|@include\b/.test(sample)) {
    // Less (@var:) or SCSS ($var:, @mixin)
    if (/\$[A-Za-z-]+:\s*[^;]+;|@mixin\b|@include\b/.test(sample)) return 'scss';
    return 'less';
  }
  if (/[.#][A-Za-z0-9_-]+\s*\{[\s\S]*?\}/.test(sample) && /:[^;]+;/.test(sample)) {
    return 'css';
  }

  // 3) Strong Java heuristics before TypeScript to avoid false positives on 'import ...;' patterns
  const looksLikeJava = (
    /\bpackage\s+[a-zA-Z_][\w.]*\s*;/.test(sample) ||
    /\bimport\s+(java\.|javax\.|jakarta\.|org\.)[\w.]*\s*;/.test(sample) ||
    /\bpublic\s+(class|interface|enum)\s+[A-Z][A-Za-z0-9_]*/.test(sample) ||
    /@Override\b/.test(sample)
  );
  if (looksLikeJava) return 'java';

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
    /\btype\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*/
  ];
  if (tsHeuristics.some(re => re.test(sample))) return 'typescript';
  // 4.1) Generic JavaScript heuristics
  if (/(^|\n)\s*(const|let|var|function)\b/.test(sample) || /=>\s*\{?/.test(sample)) return 'javascript';

  // 5) highlight.js with confidence threshold
  const result = hljs.highlightAuto(sample);
  const map: Record<string, string> = {
    javascript: 'javascript', typescript: 'typescript', jsx: 'javascript', tsx: 'typescript',
    html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', markdown: 'markdown',
    java: 'java', python: 'python', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'go', php: 'php', ruby: 'ruby', rust: 'rust',
    bash: 'shell', shell: 'shell', sql: 'sql', plaintext: 'plaintext'
  };
  const candidate = result.language ? map[result.language] : undefined;
  const confident = typeof (result as any).relevance === 'number' ? ((result as any).relevance >= 8) : !!candidate;
  if (candidate && confident) return candidate;

  // fall back to soft hint if provided, else to configured fallback
  return softHint || fallback;
}

