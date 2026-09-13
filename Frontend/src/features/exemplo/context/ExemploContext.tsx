import { createContext, useState, useEffect, type ReactNode } from 'react';
import { exemploService, type ExemploData } from '../service/exemplo.service';

export interface ExemploContextType {
  dados: ExemploData[];
  loading: boolean;
  recarregar: () => Promise<void>;
}

export const ExemploContext = createContext<ExemploContextType | undefined>(undefined);

export function ExemploProvider({ children }: { children: ReactNode }) {
  const [dados, setDados] = useState<ExemploData[]>([]);
  const [loading, setLoading] = useState(true);

  const recarregar = async () => {
    setLoading(true);
    try {
      const items = await exemploService.listar();
      setDados(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <ExemploContext.Provider value={{ dados, loading, recarregar }}>
      {children}
    </ExemploContext.Provider>
  );
}
