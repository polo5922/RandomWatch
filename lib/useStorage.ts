import { useEffect, useState } from 'react';
import type { WxtStorageItem } from '#imports';

/** Valeur d'un item de stockage WXT, mise à jour en direct. */
export function useStorage<T>(item: WxtStorageItem<T, Record<string, unknown>>): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    void item.getValue().then(setValue);
    return item.watch((v) => setValue(v));
  }, [item]);
  return value;
}
