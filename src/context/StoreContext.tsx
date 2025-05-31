import { createContext, useContext, useState, type ReactNode } from 'react';

type StoreType = 'GP_daily' | 'GP_store';

interface StoreContextType {
  activeStore: StoreType;
  switchStore: (store: StoreType) => void;
}

interface StoreProviderProps {
  children: ReactNode;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [activeStore, setActiveStore] = useState<StoreType>('GP_daily');

  const switchStore = (store: StoreType) => {
    setActiveStore(store);
  };

  return (
    <StoreContext.Provider value={{ activeStore, switchStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}; 