import { useContext } from 'react';
import { ExemploContext, type ExemploContextType } from '../context/ExemploContext';

export function useExemplo(): ExemploContextType {
  const context = useContext(ExemploContext);
  if (!context) {
    throw new Error('useExemplo deve ser utilizado dentro de um ExemploProvider');
  }
  return context;
}
