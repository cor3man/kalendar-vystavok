import type { EditError } from '../../domain/editing.ts';
import { ru } from '../../i18n/ru.ts';

/** Russian message for an edit the store refused. */
export function editErrorText(error: EditError): string {
  return ru.editErrors[error];
}
