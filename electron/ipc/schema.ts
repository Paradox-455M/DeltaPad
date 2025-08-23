import { z } from 'zod';

export const EolSchema = z.enum(['lf', 'crlf']);

export const FileOpenParams = z.object({
  allowUnsavedPrompt: z.boolean().optional().default(true),
  path: z.string().optional()
});

export const FileSaveParams = z.object({
  filePath: z.string().min(1).optional(),
  content: z.string(),
  eol: EolSchema
});

export const FileSaveAsParams = FileSaveParams.extend({
  defaultPath: z.string().optional()
});

export const DialogOpenParams = z.object({
  filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional(),
  properties: z.array(z.enum(['openFile', 'multiSelections'])).default(['openFile'])
});

export const SettingsKey = z.enum(['theme', 'followSystemTheme', 'recentFiles', 'windowBounds', 'wordWrap']);
export const SettingsGetParams = z.object({ key: SettingsKey });
export const SettingsSetParams = z.object({
  key: SettingsKey,
  value: z.any()
});

export type tFileSaveParams = z.infer<typeof FileSaveParams>;
export type tFileSaveAsParams = z.infer<typeof FileSaveAsParams>;
export type tSettingsKey = z.infer<typeof SettingsKey>;

