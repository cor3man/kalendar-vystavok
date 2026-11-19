/** Formats a semantic version for display, e.g. "0.1.0" -> "v0.1.0". */
export function formatVersion(version: string): string {
  return `v${version}`;
}
