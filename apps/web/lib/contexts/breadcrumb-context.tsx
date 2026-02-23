"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface BreadcrumbContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  title: null,
  setTitle: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [title, setTitleRaw] = useState<string | null>(null);
  const setTitle = useCallback((t: string | null) => setTitleRaw(t), []);

  return (
    <BreadcrumbContext.Provider value={{ title, setTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbTitle() {
  return useContext(BreadcrumbContext);
}
