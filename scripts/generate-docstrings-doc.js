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

function formatDescription(lines) {
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  if (lines.length === 0) return '';

  const formatted = [];
  for (let i = 0; i < lines.length; i++) {
    const curr = lines[i].trim();
    if (curr === '') {
      if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
        formatted.push('');
      }
      continue;
    }

    const isList = /^[-*]\s+|^\d+\.\s+/.test(curr);
    const prev = formatted.length > 0 ? formatted[formatted.length - 1] : null;

    if (isList) {
      if (prev !== null && prev !== '' && !/^[-*]\s+|^\d+\.\s+/.test(prev)) {
        formatted.push('');
      }
      formatted.push(curr);
    } else {
      if (prev === null || prev === '') {
        formatted.push(curr);
      } else if (/^[-*]\s+|^\d+\.\s+/.test(prev)) {
        formatted.push('');
        formatted.push(curr);
      } else {
        formatted[formatted.length - 1] += ' ' + curr;
      }
    }
  }

  return formatted.join('\n');
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
    const rawLines = rawComment.split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trimEnd());
    const descriptionLines = [];
    const params = [];
    let returns = null;

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (line.startsWith('@param')) {
        const paramMatch = line.match(/^@param\s*(?:\{[^}]*\}\s*)?(?:\[([^\]]+)\]|([a-zA-Z0-9_$]+))\s*(?:-\s*)?(.*)$/);
        if (paramMatch) {
          const name = (paramMatch[1] || paramMatch[2] || '').split('=')[0].trim();
          const desc = (paramMatch[3] || '').trim();
          params.push({ name, desc });
        } else {
          const rest = line.replace(/^@param\s*/, '').trim();
          const spaceIdx = rest.indexOf(' ');
          if (spaceIdx !== -1) {
            params.push({
              name: rest.slice(0, spaceIdx).trim(),
              desc: rest.slice(spaceIdx + 1).replace(/^-\s*/, '').trim(),
            });
          } else {
            params.push({ name: rest, desc: '' });
          }
        }
      } else if (line.startsWith('@returns') || line.startsWith('@return')) {
        returns = line.replace(/@returns?/, '').replace(/^-\s*/, '').trim();
      } else if (line.startsWith('@throws') || line.startsWith('@throw')) {
        // skip – @throws is metadata, not description
      } else if (line.startsWith('@') && !line.startsWith('@deprecated')) {
        // skip other metadata tags
      } else if (!line.startsWith('=')) {
        descriptionLines.push(rawLine);
      }
    }

    const description = formatDescription(descriptionLines);

    if (description || params.length > 0 || returns) {
      blocks.push({ identifier, description, params, returns });
    }
  }

  return blocks;
}

const MODULE_INFO = {
  anotacao: { title: 'Clinical Notes', category: 'Backend (Clinical Modules)' },
  sessao: { title: 'Session and Pairing', category: 'Backend (Clinical Modules)' },
  telemetria: { title: 'Telemetry and Metrics', category: 'Backend (Clinical Modules)' },
  auditoria: { title: 'Audit Trail', category: 'Backend (Clinical Modules)' },
  auth: { title: 'Authentication and Profile', category: 'Backend (Administration)' },
  paciente: { title: 'Patient Management', category: 'Backend (Administration)' },
  terapeuta: { title: 'Therapist Management', category: 'Backend (Administration)' },
  jogos: { title: 'Games Catalog', category: 'Backend (Administration)' },
  exemplo: { title: 'Examples and Utilities', category: 'Infrastructure & Core' },
  core: { title: 'Events and Middlewares', category: 'Infrastructure & Core' },
  frontend: { title: 'React Hooks and Services', category: 'Frontend' },
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
  let indexMd = `# Function and Method Catalog\n\n`;
  indexMd += `Consolidated overview of all **${totalFuncoes} documented functions and methods** across the InTEA ecosystem, organized by domain.\n\n`;
  indexMd += `!!! info "Documentation Statistics"\n`;
  indexMd += `    * **Total documented functions:** \`${totalFuncoes}\`\n`;
  indexMd += `    * **Code files with docstrings:** \`${totalArquivos}\`\n`;
  indexMd += `---\n\n`;
  indexMd += `### Quick Navigation by Module\n\n`;
  indexMd += `| Module | Domain | Documented Functions |\n`;
  indexMd += `| :--- | :--- | :---: |\n`;

  for (const [modKey, files] of Object.entries(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'General' };
    const qtd = files.reduce((acc, f) => acc + f.docstrings.length, 0);
    indexMd += `| [**${info.title}**](${modKey}.md) | ${info.category} | \`${qtd}\` |\n`;
  }

  fs.writeFileSync(path.join(DOCS_SITE_DIR, 'index.md'), indexMd, 'utf-8');

  // 2. Gera páginas de módulo com cartões e blocos expansíveis
  for (const [modKey, files] of Object.entries(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'General' };
    let modMd = `# ${info.title}\n\n`;
    modMd += `> **Category:** ${info.category}\n\n`;
    modMd += `---\n\n`;

    for (const file of files) {
      modMd += `##  \`${file.relPath}\`\n\n`;

      for (const item of file.docstrings) {
        modMd += `### \`${item.identifier}()\`\n\n`;
        modMd += `${item.description || '*No additional description provided.*'}\n\n`;

        if (item.params.length > 0) {
          modMd += `**Input Parameters:**\n\n`;
          modMd += `| Parameter | Description |\n`;
          modMd += `| :--- | :--- |\n`;
          for (const p of item.params) {
            const paramLabel = p.name ? `\`${p.name}\`` : '-';
            const safeDesc = p.desc.replace(/\|/g, '\\|');
            modMd += `| ${paramLabel} | ${safeDesc} |\n`;
          }
          modMd += `\n`;
        } else {
          modMd += `*No input parameters required.*\n\n`;
        }

        if (item.returns) {
          modMd += `**Returns:** \`${item.returns}\`\n\n`;
        }

        modMd += `---\n\n`;
      }
    }

    fs.writeFileSync(path.join(DOCS_SITE_DIR, `${modKey}.md`), modMd, 'utf-8');
  }

  // 3. Organiza navegação em categorias claras e legíveis (em vez de 11 abas soltas)
  const groupedNav = {
    'Overview': 'index.md',
    'Backend (Clinical)': [],
    'Backend (Administration)': [],
    'Infrastructure & Core': [],
    'Frontend': [],
  };

  for (const modKey of Object.keys(modules)) {
    const info = MODULE_INFO[modKey] || { title: modKey, category: 'General' };
    const entry = { [info.title]: `${modKey}.md` };

    if (info.category.includes('Clinical')) {
      groupedNav['Backend (Clinical)'].push(entry);
    } else if (info.category.includes('Administration')) {
      groupedNav['Backend (Administration)'].push(entry);
    } else if (info.category.includes('Frontend')) {
      groupedNav['Frontend'].push(entry);
    } else {
      groupedNav['Infrastructure & Core'].push(entry);
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
# InTEA: Modern Function and Docstrings Catalog (Material Theme)
# =============================================================================

site_name: InTEA — Functions & Docstrings
site_description: Quick and intuitive reference for InTEA functions and docstrings
site_author: InTEA Team

docs_dir: docs_site
site_dir: site

theme:
  name: material
  language: en
  palette:
    # Light Mode
    - scheme: default
      primary: indigo
      accent: deep purple
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    # Dark Mode
    - scheme: slate
      primary: indigo
      accent: deep purple
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
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
  console.log(`[generate-docstrings-doc] Modern documentation generated successfully!`);
}

buildDocs();
