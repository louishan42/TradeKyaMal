import fs from 'fs';
import path from 'path';
import { getEvidenceConfig } from './githubSync';
import { getProjectWeek } from './projectWeek';
import type { PipelineAgentId } from './pythonPipeline';

export type EvidenceAgentId = Exclude<PipelineAgentId, 'fetch'>;

/** Public group repo — evidence is read without a token when repo is public */
export const DEFAULT_EVIDENCE_REPO = 'wintwah-lwin/CP3405_Group_4';
export const DEFAULT_EVIDENCE_BRANCH = 'main';

const REPORT_CANDIDATES: Record<EvidenceAgentId, (week: number) => string[]> = {
  almanac: (week) => [`almanac_agent_2026-W${week}.md`],
  macro: (week) => [`macro_report_w${week}.md`, `macro_agent_data_W${week}.md`],
  technical: (week) => [`technical_agent_2026-W${week}.md`],
  llm: (week) => [`llm_integration_2026-W${week}.md`],
  final: (week) => [`final_prediction_2026-W${week}.md`],
};

const EXTRA_CANDIDATES: Partial<Record<EvidenceAgentId, (week: number) => string[]>> = {
  llm: (week) => [
    `agreement_matrix_2026-W${week}.md`,
    `llm_responses_2026-W${week}.json`,
  ],
};

export interface EvidenceReport {
  filename: string;
  markdown: string;
  source: 'public_github' | 'github' | 'local_repo' | 'scripts_output';
  repoPath: string;
  extras?: Record<string, string>;
}

function getRepoRef(): { owner: string; repo: string; branch: string } {
  const config = getEvidenceConfig();
  const full = config.githubRepo || DEFAULT_EVIDENCE_REPO;
  const [owner, repo] = full.split('/');
  const branch = process.env.GITHUB_EVIDENCE_BRANCH?.trim() || DEFAULT_EVIDENCE_BRANCH;
  return { owner, repo, branch };
}

function decodeGitHubContent(content: string, encoding: string): string {
  if (encoding === 'base64') {
    return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
  }
  return content;
}

/** Public repos: no token required */
async function fetchPublicRaw(repoPath: string): Promise<string | null> {
  const { owner, repo, branch } = getRepoRef();
  const segments = repoPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${segments}`;

  const res = await fetch(url, {
    headers: { Accept: 'text/plain' },
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.text();
}

async function fetchFromGitHubApi(repoPath: string): Promise<string | null> {
  const { owner, repo } = getRepoRef();
  const token = process.env.GITHUB_TOKEN?.trim();
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) return null;

  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  return decodeGitHubContent(data.content, data.encoding ?? 'base64');
}

function readFromLocalRepo(repoRoot: string, repoPath: string): string | null {
  const fullPath = path.join(repoRoot, repoPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

async function readEvidenceFile(repoPath: string): Promise<{ content: string; source: EvidenceReport['source'] } | null> {
  const config = getEvidenceConfig();

  if (config.localPathConfigured && config.localPath) {
    const local = readFromLocalRepo(config.localPath, repoPath);
    if (local) return { content: local, source: 'local_repo' };
  }

  const fromRaw = await fetchPublicRaw(repoPath);
  if (fromRaw) return { content: fromRaw, source: 'public_github' };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    const fromApi = await fetchFromGitHubApi(repoPath);
    if (fromApi) return { content: fromApi, source: 'github' };
  } else {
    const fromApi = await fetchFromGitHubApi(repoPath);
    if (fromApi) return { content: fromApi, source: 'public_github' };
  }

  return null;
}

export async function readEvidenceAgentReport(
  agentId: EvidenceAgentId,
  week: number
): Promise<EvidenceReport | null> {
  const weekFolder = `evidence/Week ${week}`;
  const filenames = REPORT_CANDIDATES[agentId](week);

  for (const filename of filenames) {
    const repoPath = `${weekFolder}/${filename}`;
    const file = await readEvidenceFile(repoPath);
    if (file) {
      const extras: Record<string, string> = {};
      let source = file.source;

      for (const extraName of EXTRA_CANDIDATES[agentId]?.(week) ?? []) {
        const extraPath = `${weekFolder}/${extraName}`;
        const extra = await readEvidenceFile(extraPath);
        if (extra) {
          extras[extraName] = extra.content;
          source = extra.source;
        }
      }

      return {
        filename,
        markdown: file.content,
        source,
        repoPath,
        extras: Object.keys(extras).length ? extras : undefined,
      };
    }
  }

  return null;
}

export async function listEvidenceWeeks(): Promise<number[]> {
  const config = getEvidenceConfig();
  const weeks = new Set<number>();

  if (config.localPathConfigured && config.localPath) {
    const evidenceDir = path.join(config.localPath, 'evidence');
    if (fs.existsSync(evidenceDir)) {
      for (const entry of fs.readdirSync(evidenceDir)) {
        const match = entry.match(/^Week (\d+)$/);
        if (match) weeks.add(Number(match[1]));
      }
    }
  }

  const { owner, repo } = getRepoRef();
  const token = process.env.GITHUB_TOKEN?.trim();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/evidence`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.ok) {
    const entries = (await res.json()) as { name: string }[];
    for (const entry of entries) {
      const match = entry.name.match(/^Week (\d+)$/);
      if (match) weeks.add(Number(match[1]));
    }
  }

  if (weeks.size === 0) {
    weeks.add(getProjectWeek());
  }

  return [...weeks].sort((a, b) => b - a);
}

export function getDefaultEvidenceWeek(availableWeeks: number[]): number {
  const projectWeek = getProjectWeek();
  if (availableWeeks.includes(projectWeek)) return projectWeek;
  return availableWeeks[0] ?? projectWeek;
}
