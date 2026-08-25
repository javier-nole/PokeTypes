import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * La regla dura del proyecto: `src/lib` es lógica de dominio pura. Si un día
 * alguien importa React ahí, este test lo para antes que la review.
 */

const LIB_DIR = join(process.cwd(), 'src/lib');

const FORBIDDEN = [
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom/,
  /from\s+['"]next\//,
  /from\s+['"]next['"]/,
  /from\s+['"]@\/app\//,
  /from\s+['"]@\/components\//,
  /from\s+['"]\.\.\/\.\.\/app\//,
  /from\s+['"]\.\.\/\.\.\/components\//,
];

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('src/lib no depende de la capa de presentación', () => {
  const files = collectFiles(LIB_DIR);

  it('encuentra módulos que revisar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s no importa React ni Next', (file) => {
    const source = readFileSync(file, 'utf8');
    for (const pattern of FORBIDDEN) {
      expect(source).not.toMatch(pattern);
    }
  });
});
