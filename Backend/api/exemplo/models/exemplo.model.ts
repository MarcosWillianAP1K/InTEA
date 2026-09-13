// Model: Estrutura de dados e regras de persistência da feature
export interface ItemExemplo {
  id: string;
  nome: string;
  status: 'ativo' | 'inativo';
  criadoEm: Date;
}

export class ExemploModel {
  private static items: ItemExemplo[] = [
    { id: '1', nome: 'Item de Teste MVC', status: 'ativo', criadoEm: new Date() }
  ];

  static async listar(): Promise<ItemExemplo[]> {
    return this.items;
  }

  static async buscarPorId(id: string): Promise<ItemExemplo | undefined> {
    return this.items.find(i => i.id === id);
  }

  static async criar(nome: string): Promise<ItemExemplo> {
    const novo: ItemExemplo = {
      id: String(Date.now()),
      nome,
      status: 'ativo',
      criadoEm: new Date()
    };
    this.items.push(novo);
    return novo;
  }
}
