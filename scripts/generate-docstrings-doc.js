import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT_DIR, 'Backend', 'api'),
  path.join(ROOT_DIR, 'Backend', 'core'),
  path.join(ROOT_DIR, 'Frontend', 'src'),
];
const DOCS_SITE_DIR = path.join(ROOT_DIR, 'docs_site');

function findCodeFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (
      file === '__test__' ||
      file === 'test' ||
      file === 'node_modules' ||
      file.endsWith('.test.ts') ||
      file.endsWith('.test.tsx') ||
      file.endsWith('.spec.ts') ||
      file.endsWith('.d.ts')
    ) {
      continue;
    }
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findCodeFiles(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseDocstrings(content) {
  const blocks = [];

  // Step 1: Collect JSDoc blocks using a pattern that cannot backtrack past `*/`.
  // `(?:[^*]|\*(?!\/))*` matches any char except `*`, or a `*` NOT followed by `/`,
  // so it always stops at the FIRST `*/` and never crosses interface bodies.
  const jsdocRegex = /\/\*\*((?:[^*]|\*(?!\/))*)\*\//g;

  // Patterns to identify the function/method name in the text IMMEDIATELY after each comment.
  // Only the next 600 chars are inspected to prevent spanning unrelated declarations.
  const identifierPatterns = [
    // export async function foo / function foo
    /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/,
    // public|private|protected static async foo(
    /^\s*(?:public|private|protected)\s+static\s+(?:async\s+)?([a-zA-Z0-9_$]+)\s*[<(]/,
    // static async foo(
    /^\s*static\s+(?:async\s+)?([a-zA-Z0-9_$]+)\s*[<(]/,
    // public|private|protected async foo(
    /^\s*(?:public|private|protected)\s+(?:async\s+)?([a-zA-Z0-9_$]+)\s*[<(]/,
    // export const foo = async (...) =>
    /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\(|[a-zA-Z0-9_$]+\s*=>)/,
    // foo: async (...) | foo: function
    /^\s*([a-zA-Z0-9_$]+)\s*:\s*(?:async\s*)?(?:\(|function)/,
    // async foo<T>( | foo(
    /^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*(?:<[^>]+>)?\s*\(/,
  ];

  let match;
  while ((match = jsdocRegex.exec(content)) !== null) {
    const rawComment = match[1];

    if (rawComment.includes('@swagger')) continue;

    // Step 2: Look for the identifier only in the text immediately following the comment.
    const commentEnd = match.index + match[0].length;
    const followingText = content.slice(commentEnd, commentEnd + 600);

    let identifier = '';
    for (const pattern of identifierPatterns) {
      const m = followingText.match(pattern);
      if (m && m[1]) {
        identifier = m[1].trim();
        break;
      }
    }

    if (!identifier || identifier === 'function' || identifier === 'interface' || identifier === 'type') {
      continue;
    }

    // Step 3: Parse the JSDoc tags from the comment.
    const lines = rawComment.split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trim());
    const descriptionLines = [];
    const params = [];
    let returns = null;

    for (const line of lines) {
      if (line.startsWith('@param')) {
        const paramMatch = line.match(/^@param\s+([a-zA-Z0-9_$]+)\s*-\s*(.*)$/);
        if (paramMatch) {
          params.push({ name: paramMatch[1], desc: paramMatch[2] });
        } else {
          params.push({ name: '', desc: line.replace('@param', '').trim() });
        }
      } else if (line.startsWith('@returns') || line.startsWith('@return')) {
        returns = line.replace(/@returns?/, '').replace(/^-\s*/, '').trim();
      } else if (line.startsWith('@throws') || line.startsWith('@throw')) {
        // skip – @throws is metadata, not description
      } else if (line.length > 0 && !line.startsWith('=')) {
        descriptionLines.push(line);
      }
    }

    const description = descriptionLines.join(' ').trim();

    if (description || params.length > 0 || returns) {
      blocks.push({ identifier, description, params, returns });
    }
  }

  return blocks;
}

const MODULE_INFO = {
  anotacao: { title: 'Anotações Clínicas', category: 'Backend (Módulos Clínicos)' },
  sessao: { title: 'Sessão e Pareamento', category: 'Backend (Módulos Clínicos)' },
  telemetria: { title: 'Telemetria e Métricas', category: 'Backend (Módulos Clínicos)' },
  auditoria: { title: 'Trilha de Auditoria', category: 'Backend (Módulos Clínicos)' },
  auth: { title: 'Autenticação e Perfil', category: 'Backend (Administração)' },
  paciente: { title: 'Gestão de Pacientes', category: 'Backend (Administração)' },
  terapeuta: { title: 'Gestão de Terapeutas', category: 'Backend (Administração)' },
  jogos: { title: 'Catálogo de Jogos', category: 'Backend (Administração)' },
  exemplo: { title: 'Exemplos e Utilitários', category: 'Infraestrutura & Core' },
  core: { title: 'Eventos e Middlewares', category: 'Infraestrutura & Core' },
  frontend: { title: 'Hooks e Serviços React', category: 'Frontend' },
};

function getModuleKey(relPath) {
  if (relPath.startsWith('Frontend')) return 'frontend';
  if (relPath.startsWith('Backend/core')) return 'core';
  const match = relPath.match(/Backend\/api\/([^/]+)/);
  if (match) return match[1];
  return 'core';
}

function buildDocs() {
  if (fs.existsSync(DOCS_SITE_DIR)) {
    fs.rmSync(DOCS_SITE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DOCS_SITE_DIR, { recursive: true });

  const modules = {};
  let totalFuncoes = 0;
  let totalArquivos = 0;

  for (const targetDir of TARGET_DIRS) {
    const files = findCodeFiles(targetDir);
    for (const filePath of files) {
      const relPath = path.relative(ROOT_DIR, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const docstrings = parseDocstrings(content);

      if (docstrings.length > 0) {
        totalArquivos++;
        totalFuncoes += docstrings.length;
        const modKey = getModuleKey(relPath);
        if (!modules[modKey]) {
          modules[modKey] = [];
        }
        modules[modKey].push({ relPath, docstrings });
      }
    }
  }

  // 1. Gera página inicial simples, limpa e com cartões visuais
  let indexMd = `# Catálogo de Funções e Métodos\n\n`;
  indexMd += `Visão consolidada de todas as **${totalFuncoes} funções e métodos documentados** do ecossistema InTEA, divididos por área.\n\n`;
  indexMd += `!!! info "Estatísticas da Documentação"\n`;
  indexMd += `    * **Total de funções documentadas:** \`${totalFuncoes}\`\n`;
  indexMd += `    * **Arquivos de código com docstrings:** \`${totalArquivos}\`\n`;
  indexMd += `---\n\n`;
  indexMd += `### Navegação Rápida por Módulo\n\n`;
  indexMd += `| Módulo | Área | Funções Documentadas |\n`;
  indexMd += `| :--- | :--- | :---: |\n`;

  for (const [modKey, files] of Object.entries(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'Geral' };
    const qtd = files.reduce((acc, f) => acc + f.docstrings.length, 0);
    indexMd += `| [**${info.title}**](${modKey}.md) | ${info.category} | \`${qtd}\` |\n`;
  }

  fs.writeFileSync(path.join(DOCS_SITE_DIR, 'index.md'), indexMd, 'utf-8');

  // 2. Gera páginas de módulo com cartões e blocos expansíveis
  for (const [modKey, files] of Object.entries(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'Geral' };
    let modMd = `# ${info.title}\n\n`;
    modMd += `> **Categoria:** ${info.category}\n\n`;
    modMd += `---\n\n`;

    for (const file of files) {
      modMd += `##  \`${file.relPath}\`\n\n`;

      for (const item of file.docstrings) {
        modMd += `### \`${item.identifier}()\`\n\n`;
        modMd += `${item.description || '*Sem descrição adicional*'}\n\n`;

        if (item.params.length > 0) {
          modMd += `**Parâmetros de Entrada:**\n\n`;
          modMd += `| Parâmetro | Finalidade |\n`;
          modMd += `| :--- | :--- |\n`;
          for (const p of item.params) {
            modMd += `| \`${p.name}\` | ${p.desc} |\n`;
          }
          modMd += `\n`;
        } else {
          modMd += `*Nenhum parâmetro de entrada necessário.*\n\n`;
        }

        if (item.returns) {
          modMd += `**Retorno:** \`${item.returns}\`\n\n`;
        }

        modMd += `---\n\n`;
      }
    }

    fs.writeFileSync(path.join(DOCS_SITE_DIR, `${modKey}.md`), modMd, 'utf-8');
  }

  // 3. Organiza navegação em categorias claras e legíveis (em vez de 11 abas soltas)
  const groupedNav = {
    'Visão Geral': 'index.md',
    'Backend (Clínico)': [],
    'Backend (Administração)': [],
    'Infraestrutura & Core': [],
    'Frontend': [],
  };

  for (const modKey of Object.keys(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'Geral' };
    const entry = { [info.title]: `${modKey}.md` };

    if (info.category.includes('Clínicos')) {
      groupedNav['Backend (Clínico)'].push(entry);
    } else if (info.category.includes('Administração')) {
      groupedNav['Backend (Administração)'].push(entry);
    } else if (info.category.includes('Frontend')) {
      groupedNav['Frontend'].push(entry);
    } else {
      groupedNav['Infraestrutura & Core'].push(entry);
    }
  }

  function formatNavYaml(navObj, indent = 2) {
    let lines = [];
    const spaces = ' '.repeat(indent);
    for (const [key, value] of Object.entries(navObj)) {
      if (typeof value === 'string') {
        lines.push(`${spaces}- ${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${spaces}- ${key}:`);
        for (const item of value) {
          const itemKey = Object.keys(item)[0];
          const itemVal = item[itemKey];
          lines.push(`${spaces}    - ${itemKey}: ${itemVal}`);
        }
      }
    }
    return lines.join('\n');
  }

  const mkdocsConfig = `# =============================================================================
# InTEA: Catálogo Moderno de Funções e Docstrings (Material Theme)
# =============================================================================

site_name: InTEA — Funções & Docstrings
site_description: Referência rápida e intuitiva das funções e docstrings do projeto InTEA
site_author: Equipe InTEA

docs_dir: docs_site
site_dir: site

theme:
  name: material
  language: pt-BR
  palette:
    # Modo Claro
    - scheme: default
      primary: indigo
      accent: deep purple
      toggle:
        icon: material/brightness-7
        name: Mudar para modo escuro
    # Modo Escuro
    - scheme: slate
      primary: indigo
      accent: deep purple
      toggle:
        icon: material/brightness-4
        name: Mudar para modo claro
  features:
    - navigation.instant
    - navigation.sections
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy

markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.inlinehilite
  - pymdownx.snippets
  - pymdownx.superfences
  - toc:
      permalink: true
  - tables
  - attr_list

nav:
${formatNavYaml(groupedNav, 2)}
`;

  fs.writeFileSync(path.join(ROOT_DIR, 'mkdocs.yml'), mkdocsConfig, 'utf-8');
  console.log(`[generate-docstrings-doc] Documentação moderna gerada com sucesso!`);
}

buildDocs();
