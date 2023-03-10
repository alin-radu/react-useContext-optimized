import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from 'react';

export default function createFastContext<Store>(initialState: Store) {
  // useStoreData ////////////////////////////////////////////////////////////////////////////////
  function useStoreData(): {
    get: () => Store;
    set: (value: Partial<Store>) => void;
    subscribe: (callback: () => void) => () => void;
  } {
    const store = useRef(initialState);

    const get = useCallback(() => store.current, []);

    const subscribers = useRef(new Set<() => void>());

    const set = useCallback((value: Partial<Store>) => {
      store.current = { ...store.current, ...value };
      subscribers.current.forEach((callback) => callback());
    }, []);

    const subscribe = useCallback((callback: () => void) => {
      subscribers.current.add(callback);

      return () => subscribers.current.delete(callback);
    }, []);

    return { get, set, subscribe };
  }

  // context /////////////////////////////////////////////////////////////////////////////////////
  type UseStoreDataReturnType = ReturnType<typeof useStoreData>;

  const StoreContext = createContext<UseStoreDataReturnType | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const store = useStoreData();

    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
  }

  // useStore ////////////////////////////////////////////////////////////////////////////////////
  function useStore<SelectorOutput>(
    selector: (store: Store) => SelectorOutput
  ): [SelectorOutput, (value: Partial<Store>) => void] {
    const store = useContext(StoreContext);
    if (!store) {
      throw new Error('Store not initialized');
    }

    const selectedValue = () => selector(store.get());

    // const state = useSyncExternalStore(store.subscribe(), selectedValue);

    const [state, setState] = useState(selectedValue);

    useEffect(() => {
      return store.subscribe(() => setState(selectedValue));
    }, []);

    return [state, store.set];
  }

  return { Provider, useStore };
}
