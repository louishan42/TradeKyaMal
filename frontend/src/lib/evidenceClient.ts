import type { AgentReportResponse, AgentType, PipelineStatus } from '@/lib/types';

const EVIDENCE_REPO = 'wintwah-lwin/CP3405_Group_4';
const EVIDENCE_BRANCH = 'main';
const PROJECT_START = '2026-05-25';

type EvidenceAgentId = Exclude<AgentType, never>;

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

export function getProjectWeek(): number {
  const start = new Date(`${PROJECT_START}T00:00:00`);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function extractBiasFromMarkdown(markdown: string): string | null {
  const patterns = [
    /\*\*ALMANAC BIAS:\*\*\s*([^\n]+)/i,
    /\*\*MACRO BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*TECHNICAL BIAS:\*\*\s*([^\n]+)/i,
    /\*\*FINAL MARKET BIAS:\*\*\s*([^\n]+)/i,
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

async function fetchPublicRaw(repoPath: string): Promise<string | null> {
  const [owner, repo] = EVIDENCE_REPO.split('/');
  const segments = repoPath.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${EVIDENCE_BRANCH}/${segments}`;

  const res = await fetch(url, { headers: { Accept: 'text/plain' } });
  if (!res.ok) return null;
  return res.text();
}

export async function listEvidenceWeeks(): Promise<number[]> {
  const [owner, repo] = EVIDENCE_REPO.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/evidence`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  const weeks = new Set<number>();
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

export async function fetchEvidenceReport(
  agentId: EvidenceAgentId,
  week: number
): Promise<AgentReportResponse> {
  const weekFolder = `evidence/Week ${week}`;
  const filenames = REPORT_CANDIDATES[agentId];

  for (const filename of filenames(week)) {
    const repoPath = `${weekFolder}/${filename}`;
    const markdown = await fetchPublicRaw(repoPath);
    if (!markdown) continue;

    const extras: Record<string, string> = {};
    for (const extraName of EXTRA_CANDIDATES[agentId]?.(week) ?? []) {
      const extraPath = `${weekFolder}/${extraName}`;
      const extra = await fetchPublicRaw(extraPath);
      if (extra) extras[extraName] = extra;
    }

    return {
      week,
      source: 'public_github',
      report: {
        filename,
        markdown,
        bias: extractBiasFromMarkdown(markdown) ?? undefined,
        repoPath,
        extras: Object.keys(extras).length ? extras : undefined,
      },
    };
  }

  return {
    week,
    source: 'public_github',
    report: null,
    message: `No report found in ${EVIDENCE_REPO} for week ${week}. Run GitHub Actions, then Reload.`,
  };
}

export async function fetchPipelineStatus(): Promise<PipelineStatus> {
  const availableWeeks = await listEvidenceWeeks();
  const defaultWeek = getDefaultEvidenceWeek(availableWeeks);

  return {
    pythonAvailable: false,
    projectWeek: getProjectWeek(),
    defaultWeek,
    availableWeeks,
    githubConfigured: true,
    evidenceRepo: EVIDENCE_REPO,
    canRunAgentsOnServer: false,
    canViewEvidenceFromGitHub: true,
    evidenceSource: 'public_github',
    agents: ['almanac', 'macro', 'technical', 'llm', 'final'].map((id) => ({
      id,
      scriptAvailable: false,
    })),
  };
}
