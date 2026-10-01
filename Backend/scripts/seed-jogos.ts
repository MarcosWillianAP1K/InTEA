/**
 * CARD 2.4 — BD: Seed com 3 Jogos de Exemplo (RF09)
 *
 * Script idempotente: verifica se cada jogo já existe antes de inserir,
 * evitando duplicatas mesmo que seja executado múltiplas vezes.
 *
 * Execução:
 *   npx tsx scripts/seed-jogos.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
  console.error('[Seed] SUPABASE_URL não configurada no .env. Configure antes de rodar o seed.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const JOGOS_SEED = [
  {
    nome: 'Aventura das Cores',
    descricao: 'Estimula atenção compartilhada e reconhecimento facial através de interação cromática e emparelhamento de cores.',
    versao: '1.2.0',
    status_instalacao: 'instalado',
    manifesto_json: {
      id_jogo: 'aventura-das-cores',
      nome: 'Aventura das Cores',
      versao: '1.2.0',
      objetivo_clinico: 'foco_atencional',
      metricas_suportadas: [
        { id_metrica: 'tempo_resposta', tipo_metrica: 'numerica', unidade: 'segundos' },
        { id_metrica: 'nivel_frustracao', tipo_metrica: 'categorica', valores: ['baixo', 'medio', 'alto'] }
      ]
    }
  },
  {
    nome: 'Formas Calmas',
    descricao: 'Foco em pareamento visual e regulação sensorial em ambiente desacelerado.',
    versao: '2.0.0',
    status_instalacao: 'instalado',
    manifesto_json: {
      id_jogo: 'formas-calmas',
      nome: 'Formas Calmas',
      versao: '2.0.0',
      objetivo_clinico: 'regulacao_emocional',
      metricas_suportadas: [
        { id_metrica: 'tempo_fixacao', tipo_metrica: 'numerica', unidade: 'segundos' },
        { id_metrica: 'estabilidade_toque', tipo_metrica: 'categorica', valores: ['estavel', 'instavel'] }
      ]
    }
  },
  {
    nome: 'Som dos Animais',
    descricao: 'Associação auditivo-visual para desenvolvimento de linguagem e reconhecimento sonoro.',
    versao: '1.0.0',
    status_instalacao: 'instalado',
    manifesto_json: {
      id_jogo: 'som-dos-animais',
      nome: 'Som dos Animais',
      versao: '1.0.0',
      objetivo_clinico: 'desenvolvimento_linguagem',
      metricas_suportadas: [
        { id_metrica: 'precisao_auditiva', tipo_metrica: 'numerica', unidade: 'percentual' },
        { id_metrica: 'tolerancia_sonora', tipo_metrica: 'categorica', valores: ['baixa', 'moderada', 'boa'] }
      ]
    }
  }
];

/**
 * Executes idempotent seeding of sample therapeutic games into the database (RF09).
 * Checks existing entries before insertion to prevent duplication.
 *
 * @returns Resolves when database seeding completes.
 * @throws {Error} If database interaction or network connection fails unexpectedly.
 */
async function runSeed() {
  console.log('[Seed] Iniciando seed dos jogos terapêuticos...\n');
  let inseridos = 0;
  let ignorados = 0;

  for (const jogo of JOGOS_SEED) {
    // Verifica se o jogo já existe (idempotência)
    const { data: existente } = await supabase
      .from('jogo')
      .select('id, nome')
      .eq('nome', jogo.nome)
      .maybeSingle();

    if (existente) {
      console.log(`[Seed] Jogo "${jogo.nome}" já existe (id: ${existente.id}). Ignorado.`);
      ignorados++;
      continue;
    }

    const { data, error } = await supabase
      .from('jogo')
      .insert(jogo)
      .select('id, nome, versao, status_instalacao')
      .single();

    if (error) {
      console.error(`[Seed] Erro ao inserir "${jogo.nome}":`, error.message);
    } else {
      console.log(`[Seed] Jogo "${data.nome}" inserido com sucesso (id: ${data.id}, v${data.versao}).`);
      inseridos++;
    }
  }

  console.log(`\n[Seed] Concluído: ${inseridos} inserido(s), ${ignorados} ignorado(s) (já existente).`);
}

runSeed().catch(err => {
  console.error('[Seed] Falha inesperada no seed:', err);
  process.exit(1);
});
