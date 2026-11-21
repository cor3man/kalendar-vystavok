// Typed storage errors; the UI maps `kind` to a Russian message (src/i18n/ru.ts).

/** The data file changed on disk since it was last read or written (SPEC 4.3). */
export class ExternalChangeError extends Error {
  override readonly name = 'ExternalChangeError';
  constructor() {
    super('The data file was changed outside the app');
  }
}

export type DataFileErrorKind =
  /** No `kalendar-data.json` in the folder. */
  | 'notFound'
  /** The file is not a valid data file (bad JSON, wrong shape, failed migration). */
  | 'invalid'
  /** The file was written by a newer app version and cannot be used for this action. */
  | 'newer';

export class DataFileError extends Error {
  override readonly name = 'DataFileError';
  constructor(
    readonly kind: DataFileErrorKind,
    /** Technical details (English), shown collapsed on the error screen. */
    readonly issues: readonly string[] = [],
  ) {
    super(`Data file error: ${kind}${issues.length > 0 ? ` (${issues.join('; ')})` : ''}`);
  }
}

/** The user closed the folder picker or denied permission; not an error to report. */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error.name === 'AbortError' || error.name === 'NotAllowedError')
  );
}
