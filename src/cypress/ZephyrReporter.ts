// cypress/reporters/ZephyrReporter.ts
import fs from 'node:fs';
import path from 'node:path';

import { reporters } from 'mocha';
import type { Runner, Test } from 'mocha';

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

function readOverrides(test: any): Record<string, unknown> {
  const overrides =
    test?._testConfig ??
    test?._testConfigOverride ??
    test?.ctx?.test?._testConfig ??
    {};
  return overrides && typeof overrides === 'object' ? overrides : {};
}

function readTags(overrides: Record<string, unknown>): string[] {
  const uniqueTags = new Set<string>();

  const add = (maybeTags: unknown) => {
    if (!Array.isArray(maybeTags)) return;
    for (const value of maybeTags) {
      const tag = String(value).trim();
      if (tag) uniqueTags.add(tag);
    }
  };

  add((overrides as any).tags);

  const list = (overrides as any).testConfigList;
  if (Array.isArray(list)) {
    for (const entry of list) add(entry?.overrides?.tags);
  }

  const unverified = (overrides as any).unverifiedTestConfig;
  if (unverified && typeof unverified === 'object') add((unverified as any).tags);

  return [...uniqueTags];
}

const { Base } = reporters;

export class ZephyrReporter extends Base {
  private readonly report: JsonReport;
  private readonly outputPath: string;

  constructor(runner: Runner, options: any) {
    super(runner, options);



    const generatedAt = new Date().toISOString();

    const filePath = runner.suite?.file?.toString() || 'zephyr-report-' + generatedAt;
    const outDir = 'functional-output/zephyr/temp/' + path.dirname(filePath);
    const outFile = 'cypress-report-' + path.basename(filePath).replace(/\.cy\.ts$/, '.json');

    this.outputPath = path.resolve(outDir, outFile);

    this.report = {
      meta: { reporter: 'zephyr-json', generatedAt: generatedAt },
      stats: { tests: 0, passes: 0, failures: 0, pending: 0 },
      tests: []
    };

    runner.once('start', () => {
      this.report.meta.startedAt = new Date().toISOString();
    });

    runner.on('pass', (test: Test) => this.onTest(test as any, 'passed'));
    runner.on('fail', (test: Test, err: any) => this.onTest(test as any, 'failed', err));
    runner.on('pending', (test: Test) => this.onTest(test as any, 'pending'));

    runner.once('end', () => {
      this.report.meta.endedAt = new Date().toISOString();
      this.report.stats.durationMs = (runner as any).stats?.duration;

      fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(this.report, null, 2), 'utf8');
    });
  }

  private onTest(test: any, status: TestStatus, err?: any) {
    this.report.stats.tests++;
    if (status === 'passed') this.report.stats.passes++;
    if (status === 'failed') this.report.stats.failures++;
    if (status === 'pending') this.report.stats.pending++;

    const overrides = readOverrides(test);
    let title = test.title ?? '';
    //Remove any tags from the title (e.g. "Test case 1 [tag1, tag2]" => "Test case 1")
    const tagMatch = title.match(/^(.*?)(\s*\[.*\])?$/);
    if (tagMatch) {
      title = tagMatch[1].trim();
    }

    let file = test.file;

    let parentNameArray = [];
    let parent = test.parent;
    while ((!file) && parent) {
      file = parent.file;

      const parentTitle = parent.title;
      if (parentTitle && parentTitle.trim() !== '') {
        parentNameArray.unshift(parentTitle);
      }
      parent = parent.parent;
    }

    this.report.tests.push({
      title: title,
      fullTitle: typeof test.fullTitle === 'function' ? test.fullTitle() : (test.title ?? ''),
      file: file,
      parents: parentNameArray,
      durationMs: typeof test.duration === 'number' ? test.duration : undefined,
      status,
      tags: readTags(overrides),
      configOverrides: overrides,
      error: err ? { message: err.message ?? String(err), stack: err.stack } : undefined
    });
  }
}

export default ZephyrReporter;
