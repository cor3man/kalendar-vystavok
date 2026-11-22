import { useEffect, useState } from 'react';
import type { TextMeasurer } from '../../layout/measure.ts';
import { getCanvasMeasurer } from '../../render/canvasMeasurer.ts';

/** The shared canvas measurer once the calendar font is loaded; null until then. */
export function useMeasurer(): TextMeasurer | null {
  const [measurer, setMeasurer] = useState<TextMeasurer | null>(null);
  useEffect(() => {
    let active = true;
    void getCanvasMeasurer().then((m) => {
      if (active) setMeasurer(m);
    });
    return () => {
      active = false;
    };
  }, []);
  return measurer;
}
