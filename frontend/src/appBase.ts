/** 与 Vite `base` 一致，用于整页跳转（绕过 React Router 的 `<Link>`）。 */
export function withAppBase(path: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** React Router `basename`（无尾部斜杠）。 */
export function routerBasename(): string | undefined {
  const b = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return b || undefined;
}
