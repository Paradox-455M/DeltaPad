import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export default function useSettings() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [followSystem, setFollow] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const th = await window.api.getSetting('theme');
      if (th) setThemeState(th);
    })();
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    setThemeState(t);
    await window.api.setSetting('theme', t);
    document.documentElement.dataset.theme = t;
  }, []);

  const setFollowSystem = useCallback(async (v: boolean) => {
    setFollow(v);
    await window.api.setSetting('followSystemTheme', v);
  }, []);

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
      };
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return { theme, setTheme, followSystem, setFollowSystem };
}

