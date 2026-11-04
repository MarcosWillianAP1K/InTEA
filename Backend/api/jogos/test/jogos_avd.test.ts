// ==============================================================================
// InTEA: Testes Unitários de Jogos de Atividades da Vida Diária (AVD) e Simulação de Rotinas
// Conformidade: RF09 (Catálogo de Jogos), RF17 (Personalização Clínica), RN02 (Tipagem Estrita)
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JogoModel } from '../models/jogo.model.js';
import { ManifestoValidator } from '../validators/manifesto.validator.js';

describe('BD/Feature: Jogos de Atividades da Vida Diária (AVD) e Simulação de Rotinas (RF09, RF17)', () => {
  const caminhoSeedSql = path.resolve(
    process.cwd(),
    '../Database/seeds/01_seed_jogos.sql'
  );

  describe('1. Critério de Aceite 1: Categoria de simulação de rotinas disponível no catálogo', () => {
    it('deve listar os jogos ao filtrar por objetivo "simulacao_rotina"', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'simulacao_rotina' });
      expect(resultado.data.length).toBeGreaterThanOrEqual(2);

      const nomes = resultado.data.map(j => j.nome);
      expect(nomes).toContain('Visita ao Dentista');
      expect(nomes).toContain('Ida ao Supermercado / Atacadão');
    });

    it('deve listar os jogos ao filtrar por objetivo/foco "atividades_vida_diaria"', async () => {
      const resultado = await JogoModel.listar({ objetivo: 'atividades_vida_diaria' });
      expect(resultado.data.length).toBeGreaterThanOrEqual(2);

      const nomes = resultado.data.map(j => j.nome);
      expect(nomes).toContain('Visita ao Dentista');
      expect(nomes).toContain('Ida ao Supermercado / Atacadão');
    });

    it('o catálogo geral deve conter todos os jogos ativos incluindo as rotinas práticas', async () => {
      const resultado = await JogoModel.listar();
      expect(resultado.data.length).toBeGreaterThanOrEqual(5);

      const nomes = resultado.data.map(j => j.nome);
      expect(nomes).toContain('Aventura das Cores');
      expect(nomes).toContain('Formas Calmas');
      expect(nomes).toContain('Som dos Animais');
      expect(nomes).toContain('Visita ao Dentista');
      expect(nomes).toContain('Ida ao Supermercado / Atacadão');
    });
  });

  describe('2. Critério de Aceite 2: Jogos de exemplo com dados e objetivos clínicos cadastrados', () => {
    describe('Jogo 4: Visita ao Dentista', () => {
      it('deve recuperar os detalhes completos por ID ou slug', async () => {
        const jogoPorId = await JogoModel.buscarPorId(4);
        const jogoPorSlug = await JogoModel.buscarPorId('visita-ao-dentista');

        expect(jogoPorId).toBeDefined();
        expect(jogoPorSlug).toBeDefined();
        expect(jogoPorId?.nome).toBe('Visita ao Dentista');
        expect(jogoPorSlug?.nome).toBe('Visita ao Dentista');
      });

      it('deve possuir dados clínicos voltados à dessensibilização sensorial odontológica', async () => {
        const jogo = await JogoModel.buscarPorId('visita-ao-dentista');
        expect(jogo).toBeDefined();

        expect(jogo?.descricao).toContain('dessensibilização sensorial');
        expect(jogo?.status_jogo).toBe('ativo');
        expect(jogo?.manifesto_json.objetivo_clinico).toBe('simulacao_rotina');
        expect(jogo?.manifesto_json.foco_pedagogico).toBe('atividades_vida_diaria');
      });

      it('deve possuir métricas clínicas estritas homologadas (RN02)', async () => {
        const jogo = await JogoModel.buscarPorId('visita-ao-dentista');
        const metricas = jogo!.manifesto_json.metricas_suportadas;

        expect(metricas.length).toBeGreaterThanOrEqual(3);

        const metricaTempo = metricas.find(m => m.id_metrica === 'tempo_tolerancia');
        expect(metricaTempo).toBeDefined();
        expect(metricaTempo?.tipo_metrica).toBe('numerica');
        expect(metricaTempo?.unidade).toBe('segundos');

        const metricaAnsiedade = metricas.find(m => m.id_metrica === 'nivel_ansiedade');
        expect(metricaAnsiedade).toBeDefined();
        expect(metricaAnsiedade?.tipo_metrica).toBe('categorica');
        expect(metricaAnsiedade?.valores).toEqual(['baixo', 'moderado', 'alto']);
      });
    });

    describe('Jogo 5: Ida ao Supermercado / Atacadão', () => {
      it('deve recuperar os detalhes completos por ID ou slug', async () => {
        const jogoPorId = await JogoModel.buscarPorId(5);
        const jogoPorSlug = await JogoModel.buscarPorId('ida-ao-supermercado');

        expect(jogoPorId).toBeDefined();
        expect(jogoPorSlug).toBeDefined();
        expect(jogoPorId?.nome).toBe('Ida ao Supermercado / Atacadão');
        expect(jogoPorSlug?.nome).toBe('Ida ao Supermercado / Atacadão');
      });

      it('deve possuir dados clínicos voltados ao planejamento de compras e tolerância de estímulos', async () => {
        const jogo = await JogoModel.buscarPorId('ida-ao-supermercado');
        expect(jogo).toBeDefined();

        expect(jogo?.descricao).toContain('Treino prático de compras');
        expect(jogo?.status_jogo).toBe('ativo');
        expect(jogo?.manifesto_json.objetivo_clinico).toBe('simulacao_rotina');
        expect(jogo?.manifesto_json.foco_pedagogico).toBe('atividades_vida_diaria');
      });

      it('deve possuir métricas clínicas estritas homologadas (RN02)', async () => {
        const jogo = await JogoModel.buscarPorId('ida-ao-supermercado');
        const metricas = jogo!.manifesto_json.metricas_suportadas;

        expect(metricas.length).toBeGreaterThanOrEqual(3);

        const metricaItens = metricas.find(m => m.id_metrica === 'itens_coletados');
        expect(metricaItens).toBeDefined();
        expect(metricaItens?.tipo_metrica).toBe('numerica');
        expect(metricaItens?.unidade).toBe('itens');

        const metricaTolerancia = metricas.find(m => m.id_metrica === 'tolerancia_estimulos');
        expect(metricaTolerancia).toBeDefined();
        expect(metricaTolerancia?.tipo_metrica).toBe('categorica');
        expect(metricaTolerancia?.valores).toEqual(['baixa', 'moderada', 'alta']);
      });
    });
  });

  describe('3. Validação de Não-Competitividade e Conformidade de Manifesto', () => {
    it('ambos os jogos de rotina prática devem cumprir a Diretriz Clínica de Não-Competitividade', async () => {
      const jogoDentista = await JogoModel.buscarPorId('visita-ao-dentista');
      const confDentista = ManifestoValidator.verificarConformidadeNaoCompetitividade(
        jogoDentista!.manifesto_json
      );
      expect(confDentista.conforme).toBe(true);
      expect(confDentista.violacoes).toHaveLength(0);

      const jogoSupermercado = await JogoModel.buscarPorId('ida-ao-supermercado');
      const confSupermercado = ManifestoValidator.verificarConformidadeNaoCompetitividade(
        jogoSupermercado!.manifesto_json
      );
      expect(confSupermercado.conforme).toBe(true);
      expect(confSupermercado.violacoes).toHaveLength(0);
    });

    it('ambos os manifestos devem ser validados com sucesso por ManifestoValidator.validar()', async () => {
      const jogoDentista = await JogoModel.buscarPorId('visita-ao-dentista');
      const valDentista = ManifestoValidator.validar(jogoDentista!.manifesto_json);
      expect(valDentista.valido).toBe(true);
      expect(valDentista.erros).toHaveLength(0);

      const jogoSupermercado = await JogoModel.buscarPorId('ida-ao-supermercado');
      const valSupermercado = ManifestoValidator.validar(jogoSupermercado!.manifesto_json);
      expect(valSupermercado.valido).toBe(true);
      expect(valSupermercado.erros).toHaveLength(0);
    });
  });

  describe('4. Persistência e Idempotência no Seed SQL (01_seed_jogos.sql)', () => {
    it('o arquivo de seed SQL deve conter os scripts de inserção idempotente para ambos os jogos', () => {
      expect(fs.existsSync(caminhoSeedSql)).toBe(true);
      const conteudoSeed = fs.readFileSync(caminhoSeedSql, 'utf-8');

      expect(conteudoSeed).toContain('Visita ao Dentista');
      expect(conteudoSeed).toContain('44444444-4444-4444-8444-444444444444');
      expect(conteudoSeed).toContain('visita-ao-dentista');
      expect(conteudoSeed).toContain('simulacao_rotina');

      expect(conteudoSeed).toContain('Ida ao Supermercado / Atacadão');
      expect(conteudoSeed).toContain('55555555-5555-4555-8555-555555555555');
      expect(conteudoSeed).toContain('ida-ao-supermercado');

      expect(conteudoSeed).toContain('ON CONFLICT (id) DO UPDATE');
    });
  });
});
