const winEnv = (window as any)._env_ || {};

export const apiBase: string =
  winEnv.REACT_APP_API_BASE || process.env.REACT_APP_API_BASE || '';
