type Options = { max?: number; batchSize?: number };
type Entry = { path: string; value: unknown };
type Entries = { items: Entry[]; truncated: boolean };

export function flattenJson(text: string, dotPathFilter?: string, options?: Options): { entries: Entries } {
  const max = options?.max ?? 5000;
  const batchSize = options?.batchSize ?? 500;
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON. Open a JSON file to use this panel.');
  }

  const items: Entry[] = [];
  let truncated = false;

  const push = (path: string, value: unknown) => {
    if (dotPathFilter && !path.includes(dotPathFilter)) return;
    if (items.length < max) items.push({ path, value });
    else truncated = true;
  };

  const queue: Array<{ value: any; path: string }> = [{ value: parsed, path: '' }];

  function step() {
    let processed = 0;
    while (queue.length && processed < batchSize) {
      const { value, path } = queue.shift()!;
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          const p = path ? `${path}[${i}]` : `[${i}]`;
          if (typeof v === 'object' && v !== null) queue.push({ value: v, path: p });
          else push(p, v);
        });
      } else if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach(k => {
          const v = (value as any)[k];
          const p = path ? `${path}.${k}` : k;
          if (typeof v === 'object' && v !== null) queue.push({ value: v, path: p });
          else push(p, v);
        });
      } else {
        push(path || '$', value);
      }
      processed++;
    }
    if (queue.length && items.length < max) {
      setTimeout(step, 0);
    }
  }
  step();

  return { entries: { items, truncated } };
}

