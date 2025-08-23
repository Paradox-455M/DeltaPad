import Store from 'electron-store';

type Bounds = { width: number; height: number; x?: number; y?: number };
type Settings = {
  theme: 'light' | 'dark' | 'system';
  followSystemTheme: boolean;
  recentFiles: string[];
  windowBounds?: Bounds;
  wordWrap: boolean;
};

const schema = {
  theme: { type: 'string', enum: ['light', 'dark', 'system'], default: 'system' },
  followSystemTheme: { type: 'boolean', default: true },
  recentFiles: { type: 'array', default: [] },
  windowBounds: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' } }, additionalProperties: true },
  wordWrap: { type: 'boolean', default: true }
} as const;

const store = new Store<Settings>({ schema: schema as any, name: 'deltapad-settings' });

export const SettingsStore = {
  get<K extends keyof Settings>(key: K): Settings[K] {
    return store.get(key) as Settings[K];
  },
  set<K extends keyof Settings>(key: K, value: Settings[K]) {
    store.set(key, value);
  },
  pushRecent(filePath: string) {
    const max = 12;
    const arr = Array.from(new Set([filePath, ...this.get('recentFiles').filter(p => p !== filePath)])).slice(0, max);
    this.set('recentFiles', arr);
  },
  clearRecent() {
    this.set('recentFiles', []);
  }
};

