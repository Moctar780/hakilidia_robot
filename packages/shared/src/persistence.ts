export type StorageAdapter = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
};

export function createStorageAdapter(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): StorageAdapter {
  return {
    get: async (key) => storage.getItem(key),
    set: async (key, value) => storage.setItem(key, value),
    remove: async (key) => storage.removeItem(key),
  };
}
