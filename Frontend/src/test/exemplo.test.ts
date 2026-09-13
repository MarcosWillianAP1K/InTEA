import { describe, it, expect } from 'vitest';
import { exemploService } from '../features/exemplo/service/exemplo.service';

describe('Frontend: ExemploService', () => {
  it('deve listar os dados de exemplo', async () => {
    const dados = await exemploService.listar();
    expect(dados).toBeInstanceOf(Array);
    expect(dados.length).toBeGreaterThan(0);
    expect(dados[0]).toHaveProperty('id');
    expect(dados[0]).toHaveProperty('titulo');
  });
});
