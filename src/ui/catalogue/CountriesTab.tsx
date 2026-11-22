import { useState } from 'react';
import type { Country, DataFile, Event, Id } from '../../domain/types.ts';
import { eventsUsingCountry } from '../../domain/validation.ts';
import { ru } from '../../i18n/ru.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import styles from './catalogue.module.css';
import { CountryForm } from './CountryForm.tsx';
import { InUseMessage } from './InUseMessage.tsx';

type Editing = { kind: 'new' } | { kind: 'edit'; country: Country } | null;
type Problem = { kind: 'inUse'; events: Event[] } | { kind: 'text'; text: string } | null;

/** SPEC 5.5 countries tab: flag, name; add, edit, delete. */
export function CountriesTab({ data }: { data: DataFile }) {
  const store = useStoreApi();
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const sorted = [...data.countries].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  function onDelete(id: Id) {
    const outcome = store.getState().deleteCountry(id);
    if (outcome.ok) setProblem(null);
    else if (outcome.error === 'inUse')
      setProblem({ kind: 'inUse', events: eventsUsingCountry(data, id) });
    else setProblem({ kind: 'text', text: editErrorText(outcome.error) });
  }

  return (
    <>
      {problem?.kind === 'inUse' && <InUseMessage data={data} events={problem.events} />}
      {problem?.kind === 'text' && (
        <p className={styles.message} role="alert">
          {problem.text}
        </p>
      )}
      <div className={styles.list}>
        <table className={styles.table} data-testid="country-table">
          <thead>
            <tr>
              <th scope="col">{ru.catalogue.flag}</th>
              <th scope="col">{ru.catalogue.name}</th>
              <th scope="col">{ru.catalogue.events}</th>
              <th scope="col">
                <span className={form.visuallyHidden}>{ru.common.edit}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.flag === null ? (
                    ru.catalogue.noFlag
                  ) : (
                    <img className={form.thumb} src={c.flag.dataUrl} alt={ru.catalogue.flag} />
                  )}
                </td>
                <td>{c.name}</td>
                <td>{eventsUsingCountry(data, c.id).length}</td>
                <td className={styles.actions}>
                  <button
                    type="button"
                    className={controls.link}
                    aria-label={`${ru.common.edit}: ${c.name}`}
                    onClick={() => {
                      setEditing({ kind: 'edit', country: c });
                    }}
                  >
                    {ru.common.edit}
                  </button>
                  <button
                    type="button"
                    className={controls.link}
                    aria-label={`${ru.common.delete}: ${c.name}`}
                    onClick={() => {
                      onDelete(c.id);
                    }}
                  >
                    {ru.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={controls.button}
          onClick={() => {
            setEditing({ kind: 'new' });
          }}
        >
          {ru.catalogue.addCountry}
        </button>
      </div>
      {editing !== null && (
        <CountryForm
          country={editing.kind === 'edit' ? editing.country : null}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
