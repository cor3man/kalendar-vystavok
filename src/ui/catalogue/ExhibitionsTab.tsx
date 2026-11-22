import { useState } from 'react';
import type { DataFile, Event, Exhibition, Id } from '../../domain/types.ts';
import { eventsUsingExhibition } from '../../domain/validation.ts';
import { ru } from '../../i18n/ru.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import styles from './catalogue.module.css';
import { ExhibitionForm } from './ExhibitionForm.tsx';
import { InUseMessage } from './InUseMessage.tsx';

type Editing = { kind: 'new' } | { kind: 'edit'; exhibition: Exhibition } | null;
type Problem = { kind: 'inUse'; events: Event[] } | { kind: 'text'; text: string } | null;

/** SPEC 5.5 exhibitions tab: logo, name, short name, defaults, number of events. */
export function ExhibitionsTab({ data }: { data: DataFile }) {
  const store = useStoreApi();
  const [editing, setEditing] = useState<Editing>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const countries = new Map(data.countries.map((c) => [c.id, c.name]));
  const sorted = [...data.exhibitions].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  function onDelete(id: Id) {
    const outcome = store.getState().deleteExhibition(id);
    if (outcome.ok) setProblem(null);
    else if (outcome.error === 'inUse')
      setProblem({ kind: 'inUse', events: eventsUsingExhibition(data, id) });
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
        <table className={styles.table} data-testid="exhibition-table">
          <thead>
            <tr>
              <th scope="col">{ru.catalogue.logo}</th>
              <th scope="col">{ru.catalogue.name}</th>
              <th scope="col">{ru.catalogue.shortName}</th>
              <th scope="col">{ru.catalogue.defaultCity}</th>
              <th scope="col">{ru.catalogue.defaultCountry}</th>
              <th scope="col">{ru.catalogue.defaultColor}</th>
              <th scope="col">{ru.catalogue.events}</th>
              <th scope="col">
                <span className={form.visuallyHidden}>{ru.common.edit}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.logo === null ? (
                    ''
                  ) : (
                    <img className={form.thumb} src={x.logo.dataUrl} alt={ru.catalogue.logo} />
                  )}
                </td>
                <td>{x.name}</td>
                <td className={styles.shortName}>{x.shortName}</td>
                <td>{x.defaultCity}</td>
                <td>
                  {x.defaultCountryId === null ? '' : (countries.get(x.defaultCountryId) ?? '')}
                </td>
                <td>
                  <span className={form.swatch} style={{ background: x.defaultColor }} />
                </td>
                <td>{eventsUsingExhibition(data, x.id).length}</td>
                <td className={styles.actions}>
                  <button
                    type="button"
                    className={controls.link}
                    aria-label={`${ru.common.edit}: ${x.name}`}
                    onClick={() => {
                      setEditing({ kind: 'edit', exhibition: x });
                    }}
                  >
                    {ru.common.edit}
                  </button>
                  <button
                    type="button"
                    className={controls.link}
                    aria-label={`${ru.common.delete}: ${x.name}`}
                    onClick={() => {
                      onDelete(x.id);
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
          {ru.catalogue.addExhibition}
        </button>
      </div>
      {editing !== null && (
        <ExhibitionForm
          data={data}
          exhibition={editing.kind === 'edit' ? editing.exhibition : null}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
