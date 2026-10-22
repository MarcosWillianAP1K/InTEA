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

  /**
   * Lists all example items stored in memory.
   *
   * @returns Complete array of in-memory example items.
   */
  static async listar(): Promise<ItemExemplo[]> {
    return this.items;
  }

  /**
   * Retrieves a single example item by its unique identifier.
   *
   * @param id - Unique string identifier of the item.
   * @returns The matching item if found, or undefined otherwise.
   */
  static async buscarPorId(id: string): Promise<ItemExemplo | undefined> {
    return this.items.find(i => i.id === id);
  }

  /**
   * Creates and stores a new example item in memory.
   *
   * @param nome - Descriptive name of the new example item.
   * @returns The newly created example item.
   */
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
