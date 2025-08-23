import { contextBridge, ipcRenderer } from 'electron';

const invoke = (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args);

const api = {
  openFile(params?: { allowUnsavedPrompt?: boolean }) { return invoke('file:open', params ?? {}); },
  saveFile(params: { filePath?: string; content: string; eol: 'lf' | 'crlf' }) { return invoke('file:save', params); },
  saveFileAs(params: { filePath?: string; content: string; eol: 'lf' | 'crlf'; defaultPath?: string }) { return invoke('file:saveAs', params); },
  openDialog(params?: { filters?: Array<{ name: string; extensions: string[] }>; properties?: Array<'openFile' | 'multiSelections'> }) { return invoke('dialog:open', params ?? {}); },

  getRecent() { return invoke('app:getRecent'); },
  clearRecent() { return invoke('app:clearRecent'); },

  getSetting(key: 'theme' | 'followSystemTheme' | 'recentFiles' | 'windowBounds' | 'wordWrap') { return invoke('settings:get', { key }); },
  setSetting(key: 'theme' | 'followSystemTheme' | 'recentFiles' | 'windowBounds' | 'wordWrap', value: any) { return invoke('settings:set', { key, value }); },

  onMenuAction(cb: (payload: { action: string; payload?: any }) => void) {
    ipcRenderer.on('menu:action', (_ev, data) => cb(data));
  }
};

contextBridge.exposeInMainWorld('api', api);

