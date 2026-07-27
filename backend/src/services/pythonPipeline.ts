import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export type PipelineAgentId =
  | 'fetch'
  | 'almanac'
  | 'macro'
  | 'technical'
  | 'llm'
  | 'final';

export interface PipelineResult {
  success: boolean;
  stdout: string;
  stderr: string;
  outputDir: string;
  message: string;
  agentId: PipelineAgentId;
  week: number;
}

export interface AgentReportFile {
  filename: string;
  markdown: string;
  extras?: Record<string, string>;
}

const SCRIPT_MAP: Record<PipelineAgentId, string> = {
  fetch: 'run_weekly_fetch.py',
  almanac: 'run_almanac_agent.py',
  macro: 'run_macro_agent.py',
  technical: 'run_technical_agent.py',
  llm: 'run_llm_integration.py',
  final: 'run_final_prediction.py',
};

const REPORT_FILES: Record<Exclude<PipelineAgentId, 'fetch'>, (week: number) => string[]> = {
  almanac: (week) => [`almanac_agent_2026-W${week}.md`],
  macro: (week) => [`macro_report_w${week}.md`, `macro_agent_data_W${week}.md`],
  technical: (week) => [`technical_agent_2026-W${week}.md`],
  llm: (week) => [
    `llm_integration_2026-W${week}.md`,
    `agreement_matrix_2026-W${week}.md`,
  ],
  final: (week) => [`final_prediction_2026-W${week}.md`],
};

const EXTRA_FILES: Partial<Record<PipelineAgentId, (week: number) => string[]>> = {
  llm: (week) => [`llm_responses_2026-W${week}.json`],
};

export function resolveScriptsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'scripts'),
    path.resolve(process.cwd(), '../scripts'),
    path.resolve(process.cwd(), 'TradeKyaMal/scripts'),
    path.resolve(__dirname, '../../../scripts'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'run_macro_agent.py'))) return dir;
  }
  throw new Error('Could not find scripts/run_macro_agent.py');
}

export function isPythonPipelineAvailable(): boolean {
  try {
    resolveScriptsDir();
    return true;
  } catch {
    return false;
  }
}

export function isAgentScriptAvailable(agentId: PipelineAgentId): boolean {
  try {
    const scriptsDir = resolveScriptsDir();
    return fs.existsSync(path.join(scriptsDir, SCRIPT_MAP[agentId]));
  } catch {
    return false;
  }
}

function runPythonScript(
  scriptsDir: string,
  args: string[],
  outputDir: string,
  agentId: PipelineAgentId,
  week: number
): Promise<PipelineResult> {
  return new Promise((resolve) => {
    const proc = spawn('python3', args, {
      cwd: scriptsDir,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONPATH: scriptsDir,
        MPLBACKEND: 'Agg',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        outputDir,
        agentId,
        week,
        message:
          code === 0
            ? `${agentId} agent completed for week ${week}`
            : `${agentId} agent failed (exit ${code})`,
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        stderr: `${stderr}\n${err.message}`,
        outputDir,
        agentId,
        week,
        message: `Could not run python3: ${err.message}`,
      });
    });
  });
}

export function runAgentPipeline(
  agentId: PipelineAgentId,
  week: number,
  options: { noPush?: boolean; repoPath?: string } = {}
): Promise<PipelineResult> {
  const scriptsDir = resolveScriptsDir();
  const outputDir = path.join(scriptsDir, 'output');
  const scriptPath = path.join(scriptsDir, SCRIPT_MAP[agentId]);

  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({
      success: false,
      stdout: '',
      stderr: `Script not found: ${SCRIPT_MAP[agentId]}`,
      outputDir,
      agentId,
      week,
      message: `Missing script: ${SCRIPT_MAP[agentId]}`,
    });
  }

  const args = [scriptPath, '--week', String(week)];

  if (options.noPush !== false) {
    args.push('--no-push');
  }

  const repo =
    options.repoPath?.trim() ||
    process.env.LOCAL_GROUP_REPO_PATH?.trim() ||
    process.env.REPO_ROOT?.trim();

  if (repo && fs.existsSync(repo)) {
    args.push('--repo', repo);
  }

  return runPythonScript(scriptsDir, args, outputDir, agentId, week);
}

export const FULL_PIPELINE_ORDER: PipelineAgentId[] = [
  'fetch',
  'almanac',
  'macro',
  'technical',
  'llm',
  'final',
];

export async function runFullPipeline(
  week: number,
  options: { noPush?: boolean; repoPath?: string } = {}
): Promise<PipelineResult[]> {
  const results: PipelineResult[] = [];

  for (const agentId of FULL_PIPELINE_ORDER) {
    const result = await runAgentPipeline(agentId, week, options);
    results.push(result);
    if (!result.success) break;
  }

  return results;
}

export function readAgentReport(
  agentId: Exclude<PipelineAgentId, 'fetch'>,
  week: number
): AgentReportFile | null {
  const scriptsDir = resolveScriptsDir();
  const outputDir = path.join(scriptsDir, 'output');

  if (!fs.existsSync(outputDir)) return null;

  const candidates = REPORT_FILES[agentId](week);
  let markdown = '';
  let filename = '';

  for (const name of candidates) {
    const filePath = path.join(outputDir, name);
    if (fs.existsSync(filePath)) {
      markdown = fs.readFileSync(filePath, 'utf8');
      filename = name;
      break;
    }
  }

  if (!markdown) return null;

  const extras: Record<string, string> = {};
  const extraNames = EXTRA_FILES[agentId]?.(week) ?? [];

  for (const name of extraNames) {
    const filePath = path.join(outputDir, name);
    if (fs.existsSync(filePath)) {
      extras[name] = fs.readFileSync(filePath, 'utf8');
    }
  }

  if (agentId === 'llm') {
    const agreementName = `agreement_matrix_2026-W${week}.md`;
    const agreementPath = path.join(outputDir, agreementName);
    if (fs.existsSync(agreementPath)) {
      extras[agreementName] = fs.readFileSync(agreementPath, 'utf8');
    }
  }

  return { filename, markdown, extras: Object.keys(extras).length ? extras : undefined };
}

export function extractBiasFromMarkdown(markdown: string): string | null {
  const patterns = [
    /\*\*ALMANAC BIAS:\*\*\s*([^\n]+)/i,
    /\*\*MACRO BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*ALMANAC BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*MACRO BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*FINAL TECHNICAL BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*TECHNICAL BIAS:\s*([^\n]+)/i,
    /(?:^|\n)#{1,3}\s*FINAL MARKET BIAS:\s*([^\n]+)/i,
    /Overall Market Bias:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\*/g, '').trim();
    }
  }

  return null;
}

/** @deprecated use runAgentPipeline('macro', week) */
export function runMacroAgentPipeline(
  week: number,
  options: { noPush?: boolean } = {}
): Promise<PipelineResult> {
  return runAgentPipeline('macro', week, options);
}

/** @deprecated use runAgentPipeline('fetch', week) */
export function runWeeklyPythonPipeline(
  week: number,
  options: { noPush?: boolean; backendUrl?: string } = {}
): Promise<PipelineResult> {
  return runAgentPipeline('fetch', week, options);
}

export function readPipelineOutput(week: number): {
  finviz?: unknown[];
  sectors?: unknown[];
  macroMarkdown?: string;
} {
  const scriptsDir = resolveScriptsDir();
  const outputDir = path.join(scriptsDir, 'output');
  const result: {
    finviz?: unknown[];
    sectors?: unknown[];
    macroMarkdown?: string;
  } = {};

  if (!fs.existsSync(outputDir)) return result;

  const stamp = new Date().toISOString().slice(0, 10);
  const finvizCandidates = [
    path.join(outputDir, `macro_finviz_1w_${stamp}.json`),
    path.join(outputDir, `finviz_futures_1W_${stamp}.json`),
  ];
  const sectorsCandidates = [
    path.join(outputDir, `macro_yahoo_sectors_${stamp}.json`),
    path.join(outputDir, `yahoo_sectors_5D_${stamp}.json`),
  ];
  const macroCandidates = [
    path.join(outputDir, `macro_report_w${week}.md`),
    path.join(outputDir, `macro_agent_data_W${week}.md`),
  ];

  const finvizFile = finvizCandidates.find((f) => fs.existsSync(f));
  const sectorsFile = sectorsCandidates.find((f) => fs.existsSync(f));
  const macroFile = macroCandidates.find((f) => fs.existsSync(f));

  if (finvizFile) {
    result.finviz = JSON.parse(fs.readFileSync(finvizFile, 'utf8'));
  }
  if (sectorsFile) {
    result.sectors = JSON.parse(fs.readFileSync(sectorsFile, 'utf8'));
  }
  if (macroFile) {
    result.macroMarkdown = fs.readFileSync(macroFile, 'utf8');
  }

  return result;
}
