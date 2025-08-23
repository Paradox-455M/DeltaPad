export {};

declare global {
  interface Window {
    api: {
      openFile: (params?: { allowUnsavedPrompt?: boolean }) => Promise<{ canceled: boolean; filePath?: string; content?: string; eol?: 'lf' | 'crlf'; error?: string }>;
      saveFile: (params: { filePath?: string; content: string; eol: 'lf' | 'crlf' }) => Promise<{ canceled: boolean; filePath?: string; error?: string }>;
      saveFileAs: (params: { filePath?: string; content: string; eol: 'lf' | 'crlf'; defaultPath?: string }) => Promise<{ canceled: boolean; filePath?: string; error?: string }>;
      openDialog: (params?: { filters?: Array<{ name: string; extensions: string[] }>; properties?: Array<'openFile' | 'multiSelections'> }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      getRecent: () => Promise<string[]>;
      clearRecent: () => Promise<boolean>;
      getSetting: (key: 'theme' | 'followSystemTheme' | 'recentFiles' | 'windowBounds' | 'wordWrap') => Promise<any>;
      setSetting: (key: 'theme' | 'followSystemTheme' | 'recentFiles' | 'windowBounds' | 'wordWrap', value: any) => Promise<boolean>;
      onMenuAction: (cb: (payload: { action: string; payload?: any }) => void) => void;
    };
  }
}

