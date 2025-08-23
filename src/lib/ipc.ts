export const ipc = {
  open: () => window.api.openFile(),
  save: (args: { filePath?: string; content: string; eol: 'lf' | 'crlf' }) => window.api.saveFile(args),
  saveAs: (args: { content: string; eol: 'lf' | 'crlf'; defaultPath?: string }) => window.api.saveFileAs(args),
  getRecent: () => window.api.getRecent(),
  clearRecent: () => window.api.clearRecent(),
  getSetting: (k: any) => window.api.getSetting(k),
  setSetting: (k: any, v: any) => window.api.setSetting(k, v)
};

