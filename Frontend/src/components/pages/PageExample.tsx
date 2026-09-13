import { LayoutExample } from '../layout/LayoutExample';
import { ButtonExample } from '../ui/ButtonExample';

export function PageExample() {
  return (
    <LayoutExample>
      <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Exemplo de Página</h2>
        <p className="text-slate-600 mb-4 text-sm">
          Estrutura padrão de página do projeto InTEA organizada na pasta components/pages.
        </p>
        <ButtonExample>Ação de Exemplo</ButtonExample>
      </div>
    </LayoutExample>
  );
}
