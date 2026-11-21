import { useId, useState, type KeyboardEvent } from 'react';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import styles from './catalogue.module.css';
import { CountriesTab } from './CountriesTab.tsx';
import { ExhibitionsTab } from './ExhibitionsTab.tsx';

type Tab = 'exhibitions' | 'countries';
const TABS: readonly Tab[] = ['exhibitions', 'countries'];

/** SPEC 5.5: exhibitions and countries in two tabs (a modal dialog, approved M4). */
export function CatalogueDialog({ onClose }: { onClose: () => void }) {
  const id = useId();
  const data = useCalendarStore((s) => s.data);
  const [tab, setTab] = useState<Tab>('exhibitions');
  if (data === null) return null;

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + 1) % TABS.length] ?? 'exhibitions';
    setTab(next);
    document.getElementById(`${id}-${next}`)?.focus();
  }

  const label = { exhibitions: ru.catalogue.exhibitionsTab, countries: ru.catalogue.countriesTab };
  return (
    <Dialog
      title={ru.catalogue.title}
      testId="catalogue-dialog"
      wide
      onClose={onClose}
      actions={
        <button type="button" className={controls.button} onClick={onClose}>
          {ru.common.close}
        </button>
      }
    >
      <div className={styles.tabs} role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            id={`${id}-${t}`}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === t}
            aria-controls={`${id}-panel`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => {
              setTab(t);
            }}
            onKeyDown={onTabKey}
          >
            {label[t]}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
        {tab === 'exhibitions' ? <ExhibitionsTab data={data} /> : <CountriesTab data={data} />}
      </div>
    </Dialog>
  );
}
