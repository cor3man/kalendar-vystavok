import { useId, useRef, useState } from 'react';
import type { ImageData } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import controls from '../common/controls.module.css';
import form from '../common/form.module.css';
import { IMAGE_ACCEPT, importImage, type SizeLimit } from '../common/imageImport.ts';
import styles from './catalogue.module.css';

interface ImageFieldProps {
  label: string;
  value: ImageData | null;
  limit: SizeLimit;
  testId: string;
  onChange: (image: ImageData | null) => void;
}

/** Upload (PNG, JPG, SVG), preview and remove of a logo or flag (SPEC 5.5). */
export function ImageField({ label, value, limit, testId, onChange }: ImageFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    const result = await importImage(file, limit);
    if (result.ok) {
      setError(null);
      onChange(result.image);
    } else {
      setError(
        result.error === 'tooLarge' ? ru.catalogue.imageTooLarge : ru.catalogue.imageUnreadable,
      );
    }
  }

  return (
    <div className={form.field}>
      <span id={id} className={form.label}>
        {label}
      </span>
      <div className={controls.row} role="group" aria-labelledby={id}>
        {value !== null && (
          <img
            className={styles.imagePreview}
            src={value.dataUrl}
            alt=""
            data-testid={`${testId}-preview`}
          />
        )}
        <button type="button" className={controls.button} onClick={() => input.current?.click()}>
          {ru.catalogue.upload}
        </button>
        {value !== null && (
          <button
            type="button"
            className={controls.link}
            onClick={() => {
              onChange(null);
            }}
          >
            {ru.catalogue.removeImage}
          </button>
        )}
        <input
          ref={input}
          className={form.fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          data-testid={testId}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file !== undefined) void onFile(file);
          }}
        />
      </div>
      <span className={controls.hint}>{ru.catalogue.imageHint}</span>
      {error !== null && (
        <p className={form.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
