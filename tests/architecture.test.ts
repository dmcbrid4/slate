import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');
const sourceRoot = join(repositoryRoot, 'src');
const sourceExtensions = ['.ts', '.tsx'] as const;

type Layer = 'application' | 'db' | 'domain' | 'providers' | 'read-models';

const allowedLocalDependencies: Readonly<Record<Layer, ReadonlySet<Layer>>> = {
  domain: new Set(['domain']),
  'read-models': new Set(['domain', 'read-models']),
  application: new Set(['application', 'domain', 'read-models']),
  providers: new Set(['application', 'domain', 'providers']),
  db: new Set(['application', 'db', 'domain']),
};

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : sourceExtensions.some(extension => path.endsWith(extension))
        ? [path]
        : [];
  });
}

function importsIn(file: string): readonly string[] {
  const source = readFileSync(file, 'utf8');
  const pattern = /\b(?:import|export)\s+(?:type\s+)?(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g;
  return [...source.matchAll(pattern)].map(match => match[1]);
}

function resolveLocalImport(fromFile: string, specifier: string): string | undefined {
  const base = specifier.startsWith('@/')
    ? join(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(fromFile), specifier)
      : undefined;

  if (!base) return undefined;
  const withoutExtension = base.replace(/\.(?:ts|tsx)$/, '');
  const candidates = [
    ...sourceExtensions.map(extension => `${withoutExtension}${extension}`),
    ...sourceExtensions.map(extension => join(withoutExtension, `index${extension}`)),
  ];
  return candidates.find(candidate => existsSync(candidate));
}

function sourceLayer(file: string): string {
  return relative(sourceRoot, file).split('/')[0];
}

test('architectural layers only import in the approved direction', () => {
  for (const [layer, allowed] of Object.entries(allowedLocalDependencies) as [Layer, ReadonlySet<Layer>][]) {
    for (const file of sourceFiles(join(sourceRoot, layer))) {
      for (const specifier of importsIn(file)) {
        const dependency = resolveLocalImport(file, specifier);
        if (!dependency) continue;

        const dependencyLayer = sourceLayer(dependency);
        assert.ok(
          allowed.has(dependencyLayer as Layer),
          `${relative(repositoryRoot, file)} imports disallowed layer ${dependencyLayer} through ${specifier}.`,
        );
      }
    }
  }
});

test('the client dependency closure excludes server, database, provider, and seed modules', () => {
  const entry = join(sourceRoot, 'components/SlateApp.tsx');
  const pending = [entry];
  const visited = new Set<string>();
  const forbidden = [
    join(sourceRoot, 'server'),
    join(sourceRoot, 'db'),
    join(sourceRoot, 'providers'),
    join(sourceRoot, 'data/canonical-seed.ts'),
    join(sourceRoot, 'data/mock-scoreboard-repository.ts'),
  ].map(path => normalize(path));

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);

    for (const specifier of importsIn(file)) {
      assert.notEqual(specifier, 'server-only', `${relative(repositoryRoot, file)} imports server-only.`);
      const dependency = resolveLocalImport(file, specifier);
      if (!dependency) continue;

      const normalizedDependency = normalize(dependency);
      assert.ok(
        forbidden.every(path => normalizedDependency !== path && !normalizedDependency.startsWith(`${path}/`)),
        `${relative(repositoryRoot, file)} reaches forbidden client dependency ${relative(repositoryRoot, dependency)}.`,
      );
      pending.push(dependency);
    }
  }

  assert.ok(visited.size > 1, 'The client dependency walk should include SlateApp dependencies.');
});
