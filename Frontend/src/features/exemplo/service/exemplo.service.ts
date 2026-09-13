// Exemplo de Service para chamadas de API / regras de negócio da feature
export interface ExemploData {
  id: string;
  titulo: string;
  ativo: boolean;
}

export const exemploService = {
  async listar(): Promise<ExemploData[]> {
    return [
      { id: '1', titulo: 'Item de Exemplo 1', ativo: true },
      { id: '2', titulo: 'Item de Exemplo 2', ativo: false }
    ];
  }
};
