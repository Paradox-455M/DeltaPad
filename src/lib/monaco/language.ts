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

