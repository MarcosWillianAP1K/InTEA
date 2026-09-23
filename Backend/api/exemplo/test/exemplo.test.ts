import { describe, it, expect } from 'vitest';
import { ExemploModel } from '../models/exemplo.model.js';

describe('Backend: ExemploModel (MVC)', () => {
  it('deve listar itens cadastrados', async () => {
    const items = await ExemploModel.listar();
    expect(items).toBeInstanceOf(Array);
    expect(items.length).toBeGreaterThan(0);
  });

  it('deve criar um novo item com sucesso', async () => {
    const novo = await ExemploModel.criar('Item Teste Automatizado');
    expect(novo).toBeDefined();
    expect(novo.nome).toBe('Item Teste Automatizado');
    expect(novo.status).toBe('ativo');
  });

  it('deve buscar um item existente pelo id', async () => {
    const item = await ExemploModel.buscarPorId('1');
    expect(item).toBeDefined();
    expect(item?.id).toBe('1');
  });
});
