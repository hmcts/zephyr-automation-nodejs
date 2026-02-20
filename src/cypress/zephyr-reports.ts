import fs from 'node:fs';
import path from 'node:path';

type TestStatus = 'passed' | 'failed' | 'pending';
type JsonError = { message: string; stack?: string };

type JsonTest = {
  title: string;
  fullTitle: string;
  parents: string[];
  file?: string;
  durationMs?: number;
  status: TestStatus;
  tags: string[];
  configOverrides: Record<string, unknown>;
  error?: JsonError;
};

type JsonReport = {
  meta: {
    reporter: 'zephyr-json';
    generatedAt: string;
    startedAt?: string;
    endedAt?: string;
  };
  stats: {
    tests: number;
    passes: number;
    failures: number;
    pending: number;
    durationMs?: number;
  };
  tests: JsonTest[];
};

function isZephyrReport(obj: any): obj is JsonReport {
  return obj && obj.meta?.reporter === 'zephyr-json' && Array.isArray(obj.tests) && obj.stats;
}

function readJson(filePath: string): JsonReport | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return isZephyrReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function isoMin(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function isoMax(a?: string, b?: string) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function dedupeTests(tests: JsonTest[]): JsonTest[] {
  const seen = new Set<string>();
  const out: JsonTest[] = [];
  for (const t of tests) {
    const key = JSON.stringify({ fullTitle: t.fullTitle, file: t.file ?? '', parents: t.parents ?? [] });
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export type Options = {
  rootDir: string;         // e.g. functional-output
  dedupe?: boolean;        // dedupe tests
  allowMergeOnAllThreads?: boolean; // allow merge even if CYPRESS_THREAD is not '0' or '1' (default: false)
};


export function cleanZephyrReports(opts: Options) {
  const baseDir = path.resolve(opts.rootDir) + '/zephyr';

  if (!fs.existsSync(baseDir)) {
    console.warn(`[merge-zephyr] Root folder does not exist: ${baseDir}`);
    return;
  }
  const root = path.resolve(baseDir);

  fs.rmSync(root, { recursive: true, force: true });
}

export function mergeZephyrReports(opts: Options) {
  const baseDir = path.resolve(opts.rootDir) + '/zephyr';
  const root = baseDir + '/temp';
  const thread = process.env['CYPRESS_THREAD'] || '1';
  const outFile = baseDir + `/zephyr-report-${thread}.json`;
  const dedupe = Boolean(opts.dedupe);
  if (!opts.allowMergeOnAllThreads && thread !== '1') {
    console.warn('[merge-zephyr] Warning: CYPRESS_THREAD is not set to \'0\' or \'1\'. Skipping merge as this is redundant.');
    return;
  }
  if (!fs.existsSync(root)) {
    console.warn(`[merge-zephyr] Root folder does not exist: ${root}`);
    return;
  }

  const allFiles = walk(root);
  const inputFiles = allFiles
    .filter((f) => path.basename(f).startsWith('zephyr-report-'))
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .filter((f) => path.resolve(f) !== outFile);

  if (inputFiles.length === 0) {
    console.warn(`[merge-zephyr] No zephyr-report-*.json found under ${root}`);
    return;
  }

  const reports: { file: string; report: JsonReport }[] = [];
  for (const f of inputFiles) {
    const r = readJson(f);
    if (r) reports.push({ file: f, report: r });
  }

  if (reports.length === 0) {
    console.warn(`[merge-zephyr] Found inputs but none were valid zephyr-json reports.`);
    return;
  }

  const now = new Date().toISOString();
  let startedAt: string | undefined;
  let endedAt: string | undefined;

  let tests: JsonTest[] = [];
  for (const { report } of reports) {
    startedAt = isoMin(startedAt, report.meta.startedAt);
    endedAt = isoMax(endedAt, report.meta.endedAt);
    tests = tests.concat(report.tests);
  }
  if (dedupe) tests = dedupeTests(tests);

  const stats = tests.reduce(
    (acc, t) => {
      acc.tests++;
      if (t.status === 'passed') acc.passes++;
      if (t.status === 'failed') acc.failures++;
      if (t.status === 'pending') acc.pending++;
      acc.durationMs += t.durationMs ?? 0;
      return acc;
    },
    { tests: 0, passes: 0, failures: 0, pending: 0, durationMs: 0 }
  );

  const merged: JsonReport = {
    meta: { reporter: 'zephyr-json', generatedAt: now, startedAt, endedAt },
    stats: {
      tests: stats.tests,
      passes: stats.passes,
      failures: stats.failures,
      pending: stats.pending,
      durationMs: stats.durationMs || undefined
    },
    tests
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2), 'utf8');

  console.log(
    `[merge-zephyr] Merged ${reports.length} reports -> ${outFile} (${merged.stats.tests} tests)`
  );
}
