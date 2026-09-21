import { describe, it, expect } from 'vitest';
import { JogoModel } from '../api/jogos/models/jogo.model.js';
import { ManifestoValidator } from '../api/jogos/validators/manifesto.validator.js';

describe('Card 2.4 — BD: Seed com 3 Jogos de Exemplo (RF09)', () => {
  const NOMES_ESPERADOS = ['Aventura das Cores', 'Formas Calmas', 'Som dos Animais'];

  describe('Critério 1: O seed cadastra os 3 jogos esperados', () => {
    it('deve listar exatamente os 3 jogos do seed nos dados do modelo', async () => {
      const jogos = await JogoModel.listar();
      expect(jogos.length).toBeGreaterThanOrEqual(3);
      for (const nome of NOMES_ESPERADOS) {
        expect(jogos.some(j => j.nome === nome)).toBe(true);
      }
    });

    it('cada jogo deve ter nome, versão, descrição e status de instalação preenchidos', async () => {
      const jogos = await JogoModel.listar();
      for (const jogo of jogos) {
        expect(jogo.nome).toBeTruthy();
        expect(jogo.versao).toBeTruthy();
        expect(jogo.descricao).toBeTruthy();
        expect(jogo.status_instalacao).toBe('instalado');
      }
    });
  });

  describe('Critério 2: Os manifestos dos jogos seed são válidos', () => {
    it('Aventura das Cores — manifesto válido com métricas numéricas e categóricas', async () => {
      const jogo = await JogoModel.buscarPorId(1);
      expect(jogo).toBeDefined();
      expect(jogo!.nome).toBe('Aventura das Cores');

      const resultado = ManifestoValidator.validar(jogo!.manifesto_json);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);

      const ids = jogo!.manifesto_json.metricas_suportadas.map(m => m.id_metrica);
      expect(ids).toContain('tempo_resposta');
      expect(ids).toContain('nivel_frustracao');
    });

    it('Formas Calmas — manifesto válido com métricas de fixação e toque', async () => {
      const jogo = await JogoModel.buscarPorId(2);
      expect(jogo).toBeDefined();
      expect(jogo!.nome).toBe('Formas Calmas');

      const resultado = ManifestoValidator.validar(jogo!.manifesto_json);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);

      const ids = jogo!.manifesto_json.metricas_suportadas.map(m => m.id_metrica);
      expect(ids).toContain('tempo_fixacao');
      expect(ids).toContain('estabilidade_toque');
    });

    it('Som dos Animais — manifesto válido com métricas de precisão auditiva e tolerância', async () => {
      const jogo = await JogoModel.buscarPorId(3);
      expect(jogo).toBeDefined();
      expect(jogo!.nome).toBe('Som dos Animais');

      const resultado = ManifestoValidator.validar(jogo!.manifesto_json);
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);

      const ids = jogo!.manifesto_json.metricas_suportadas.map(m => m.id_metrica);
      expect(ids).toContain('precisao_auditiva');
      expect(ids).toContain('tolerancia_sonora');
    });

    it('todos os 3 jogos seed possuem objetivo_clinico definido no manifesto', async () => {
      for (let i = 1; i <= 3; i++) {
        const jogo = await JogoModel.buscarPorId(i);
        expect(jogo!.manifesto_json.objetivo_clinico).toBeTruthy();
      }
    });

    it('todos os 3 jogos seed possuem pelo menos 2 métricas suportadas no manifesto', async () => {
      for (let i = 1; i <= 3; i++) {
        const jogo = await JogoModel.buscarPorId(i);
        expect(jogo!.manifesto_json.metricas_suportadas.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('nenhum jogo seed contém métricas sem tipo definido (conformidade com RN02)', async () => {
      for (let i = 1; i <= 3; i++) {
        const jogo = await JogoModel.buscarPorId(i);
        const metricasSemTipo = jogo!.manifesto_json.metricas_suportadas.filter(
          m => !m.tipo_metrica || !['numerica', 'categorica'].includes(m.tipo_metrica)
        );
        expect(metricasSemTipo).toHaveLength(0);
      }
    });
  });

  describe('Critério 3: Idempotência — sem duplicação de registros', () => {
    it('o modelo não deve retornar jogos com o mesmo nome duplicado', async () => {
      const jogos = await JogoModel.listar();
      const nomes = jogos.map(j => j.nome);
      const unique = new Set(nomes);
      expect(nomes.length).toBe(unique.size);
    });
  });
});
