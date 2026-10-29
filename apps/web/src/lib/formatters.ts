export function usd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.001) return `$${value.toFixed(5)}`;
  if (value < 0.1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

export function tokens(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value);
}

export function duration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function shortModel(model: string): string {
  return model.split("/").pop() ?? model;
}

export function dateTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ago(epochSeconds: number): string {
  const seconds = Math.max(0, Date.now() / 1000 - epochSeconds);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function shortDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
