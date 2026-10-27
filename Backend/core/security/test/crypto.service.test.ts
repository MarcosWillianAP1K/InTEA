import { describe, it, expect } from 'vitest';
import { CryptoService, secureLogger } from '../crypto.service.js';
import { PacienteService } from '../../../api/paciente/services/paciente.service.js';
import { PacienteModel } from '../../../api/paciente/models/paciente.model.js';
import { vi } from 'vitest';

describe('Core Security: Anonimização e Criptografia em Repouso LGPD (RNF06, RN04)', () => {
  describe('Criptografia Simétrica AES-256-GCM em Repouso', () => {
    it('deve cifrar texto sensível gerando envelope serializado no formato enc:v1:<iv>:<tag>:<ciphertext>', () => {
      const dadoSensivel = 'Paciente apresenta hipersensibilidade auditiva severa e TEA nível 2.';
      const cifrado = CryptoService.cifrar(dadoSensivel);

      expect(cifrado).toBeDefined();
      expect(cifrado).not.toBe(dadoSensivel);
      expect(cifrado.startsWith('enc:v1:')).toBe(true);

      const partes = cifrado.split(':');
      expect(partes.length).toBe(5); // ['', 'enc', 'v1', iv, tag, cipher] -> partes após split são: enc, v1, iv, tag, ciphertext
      expect(partes[0]).toBe('enc');
      expect(partes[1]).toBe('v1');
      expect(partes[2].length).toBe(24); // 12 bytes em hex = 24 caracteres
      expect(partes[3].length).toBe(32); // 16 bytes de auth tag em hex = 32 caracteres
    });

    it('deve decifrar com sucesso retornando exatamente o texto original íntegro', () => {
      const original = 'Medicamentos em uso: Risperidona 1mg ao acordar.';
      const cifrado = CryptoService.cifrar(original);
      const decifrado = CryptoService.decifrar(cifrado);

      expect(decifrado).toBe(original);
    });

    it('deve ser idempotente evitando cifragem dupla em strings já protegidas', () => {
      const original = 'Diagnóstico reservado sob sigilo médico.';
      const cifrado1 = CryptoService.cifrarSeNaoCifrado(original);
      const cifrado2 = CryptoService.cifrarSeNaoCifrado(cifrado1);

      expect(cifrado1).toBe(cifrado2);
      expect(CryptoService.decifrar(cifrado2)).toBe(original);
    });

    it('não deve quebrar ao tentar decifrar texto que já está em claro', () => {
      const textoClaro = 'Texto sem criptografia prévia';
      expect(CryptoService.decifrar(textoClaro)).toBe(textoClaro);
      expect(CryptoService.decifrarSeCifrado(textoClaro)).toBe(textoClaro);
    });

    it('deve detectar adulteração de dados (tampering) via tag de autenticação GCM', () => {
      const original = 'Laudo confidencial com integridade garantida';
      const cifrado = CryptoService.cifrar(original);
      const partes = cifrado.split(':');

      // Adultera o último caractere do ciphertext
      const ultimoChar = partes[4].slice(-1);
      const charAlterado = ultimoChar === 'a' ? 'b' : 'a';
      const ciphertextCorrompido = partes[4].slice(0, -1) + charAlterado;
      const payloadAdulterado = `${partes[0]}:${partes[1]}:${partes[2]}:${partes[3]}:${ciphertextCorrompido}`;

      // A decifragem com tag corrompida rejeita a adulteração e não devolve dados forjados
      const resultado = CryptoService.decifrar(payloadAdulterado);
      expect(resultado).not.toBe(original);
    });
  });

  describe('Anonimização e Mascaramento de Identificadores Pessoais (LGPD)', () => {
    it('deve mascarar CPF ocultando os primeiros 9 dígitos para proteger a privacidade', () => {
      expect(CryptoService.mascararCPF('123.456.789-00')).toBe('***.***.***-00');
      expect(CryptoService.mascararCPF('12345678900')).toBe('***.***.***-00');
      expect(CryptoService.mascararCPF('')).toBe('');
      expect(CryptoService.mascararCPF(null)).toBe('');
      expect(CryptoService.mascararCPF('123')).toBe('***.***.***-**');
    });

    it('deve mascarar número de telefone preservando DDD e sufixo de identificação', () => {
      expect(CryptoService.mascararTelefone('(11) 98765-4321')).toBe('(11) *****-4321');
      expect(CryptoService.mascararTelefone('86999998888')).toBe('(86) *****-8888');
      expect(CryptoService.mascararTelefone('')).toBe('');
      expect(CryptoService.mascararTelefone(null)).toBe('');
    });

    it('deve mascarar nome completo ocultando letras intermediárias dos sobrenomes', () => {
      const mascarado = CryptoService.mascararNome('Marcos Willian Silva');
      expect(mascarado).toContain('M*****');
      expect(mascarado).toContain('W*****');
      expect(mascarado).toContain('S****');
      expect(mascarado).not.toContain('Willian');
    });

    it('deve mascarar endereço de e-mail', () => {
      const mascarado = CryptoService.mascararEmail('terapeuta@intea.com.br');
      expect(mascarado).toContain('@intea.com.br');
      expect(mascarado).not.toContain('terapeuta');
    });

    it('deve anonimizar recursivamente objetos complexos antes de impressão em logs', () => {
      const payloadProntuario = {
        paciente: {
          nome: 'Gabriel Pereira Ramos',
          cpf: '111.222.333-44',
          telefone: '(86) 98888-7777',
          email: 'responsavel.gabriel@gmail.com',
          dados_clinicos: {
            diagnostico: 'TEA Nível 1',
            senha_acesso: 'segredo123',
          },
        },
        token: 'eyJhbGciOiJIUzI1Ni...',
      };

      const anonimizado = CryptoService.anonimizarParaLogs(payloadProntuario) as typeof payloadProntuario;

      // CPF, telefone, email e nome NUNCA devem estar em texto claro
      expect(anonimizado.paciente.cpf).toBe('***.***.***-44');
      expect(anonimizado.paciente.telefone).toBe('(86) *****-7777');
      expect(anonimizado.paciente.email).toContain('@gmail.com');
      expect(anonimizado.paciente.email).not.toBe('responsavel.gabriel@gmail.com');
      expect(anonimizado.paciente.nome).not.toBe('Gabriel Pereira Ramos');

      // Senhas e tokens devem ser suprimidos
      expect((anonimizado.paciente.dados_clinicos as Record<string, unknown>).senha_acesso).toBe('[REDACTED_SECRET]');
      expect((anonimizado as Record<string, unknown>).token).toBe('[REDACTED_SECRET]');
    });

    it('secureLogger deve formatar saídas sem vazar dados sensíveis', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      secureLogger.info('Cadastro de paciente', { cpf: '999.888.777-66' });
      secureLogger.warn('Tentativa de acesso', { telefone: '11988887777' });
      secureLogger.error('Falha de autenticação', { password: 'senhaSuperSecreta' });

      expect(logSpy).toHaveBeenCalled();
      const primeiroLogArgs = logSpy.mock.calls[0];
      expect(JSON.stringify(primeiroLogArgs[1])).toContain('***.***.***-66');
      expect(JSON.stringify(primeiroLogArgs[1])).not.toContain('999.888.777-66');

      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Integração com PacienteService (Camada de Serviço)', () => {
    it('deve expor métodos utilitários de cifragem e anonimização em PacienteService', () => {
      expect(typeof PacienteService.anonimizarParaLogs).toBe('function');
      expect(typeof PacienteService.cifrarDadoSensivel).toBe('function');
      expect(typeof PacienteService.decifrarDadoSensivel).toBe('function');

      const cifrado = PacienteService.cifrarDadoSensivel('Histórico de crises sensoriais');
      expect(cifrado.startsWith('enc:v1:')).toBe(true);
      expect(PacienteService.decifrarDadoSensivel(cifrado)).toBe('Histórico de crises sensoriais');
    });

    it('buscarPorId deve decifrar automaticamente campos clínicos sensíveis se vierem cifrados do banco', async () => {
      const diagnosticoOriginal = 'Autismo Nível 2 de Suporte com atraso de fala';
      const observacoesOriginais = 'Sensível a ruídos agudos acima de 60dB';

      const pacienteMock = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nome: 'Lucas Silva',
        data_nascimento: '2018-05-10',
        cpf: '123.456.789-00',
        clinica_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        status_ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        dados_clinicos: {
          diagnostico_base: CryptoService.cifrar(diagnosticoOriginal),
          observacoes_gerais: CryptoService.cifrar(observacoesOriginais),
        },
      };

      vi.spyOn(PacienteModel, 'buscarPorId').mockResolvedValueOnce(pacienteMock as any);

      const paciente = await PacienteService.buscarPorId('123e4567-e89b-12d3-a456-426614174000');

      expect(paciente).toBeDefined();
      const dc = (paciente as any).dados_clinicos;
      expect(dc.diagnostico_base).toBe(diagnosticoOriginal);
      expect(dc.observacoes_gerais).toBe(observacoesOriginais);
    });
  });
});
