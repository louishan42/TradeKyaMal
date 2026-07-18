import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AgentRun } from '../models/AgentRun';
import { macroReportSchema } from '../schemas/macroReport';
import { getMacroEvidenceFromCollection } from '../services/macroEvidence';
import { fetchLiveMacroData } from '../services/macroFetch';
import { getDefaultWeek, getProjectWeek } from '../services/projectWeek';
import {
  extractBiasFromMarkdown,
  FULL_PIPELINE_ORDER,
  isAgentScriptAvailable,
  isPythonPipelineAvailable,
  PipelineAgentId,
  readAgentReport,
  runAgentPipeline,
  runFullPipeline,
} from '../services/pythonPipeline';
import { listEvidenceWeeks, readEvidenceAgentReport, getDefaultEvidenceWeek } from '../services/evidenceReader';
import { getEvidenceConfig } from '../services/githubSync';

const router = Router();

const weekSchema = z.object({
  week: z.number().int().min(1).max(53).optional(),
});

const AGENT_META = [
  {
    id: 'almanac' as const,
    name: 'Almanac Agent',
    description: 'Seasonal and calendar-based pattern analysis for trading signals.',
    script: 'run_almanac_agent.py',
  },
  {
    id: 'macro' as const,
    name: 'Macro Agent',
    description: 'Macroeconomic indicators, rates, and global market context.',
    script: 'run_macro_agent.py',
  },
  {
    id: 'technical' as const,
    name: 'Technical Agent',
    description: 'Price action, indicators, and chart-based signal generation.',
    script: 'run_technical_agent.py',
  },
  {
    id: 'llm' as const,
    name: 'LLM Integration',
    description: 'OpenAI + Gemini synthesis across all agent reports.',
    script: 'run_llm_integration.py',
  },
  {
    id: 'final' as const,
    name: 'Final Prediction',
    description: 'Weighted final weekly prediction from all agent outputs.',
    script: 'run_final_prediction.py',
  },
];

const UI_AGENT_IDS = ['almanac', 'macro', 'technical', 'llm', 'final'] as const;

function pipelineIdForAgent(agentId: string): PipelineAgentId | null {
  if (agentId === 'fetch') return 'fetch';
  if (FULL_PIPELINE_ORDER.includes(agentId as PipelineAgentId)) {
    return agentId as PipelineAgentId;
  }
  return null;
}

async function saveAgentRun(
  agentId: PipelineAgentId,
  week: number,
  status: 'completed' | 'error',
  output: Record<string, unknown>,
  summary?: string
) {
  const now = new Date();
  return AgentRun.create({
    agentId,
    week,
    status,
    summary,
    output,
    startedAt: now,
    completedAt: now,
  });
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const agents = await Promise.all(
      AGENT_META.map(async (meta) => {
        const lastRun = await AgentRun.findOne({ agentId: meta.id })
          .sort({ createdAt: -1 })
          .lean();

        const output = lastRun?.output as { bias?: string; week?: number } | undefined;

        return {
          ...meta,
          scriptAvailable: isAgentScriptAvailable(meta.id as PipelineAgentId),
          status: lastRun?.status ?? 'idle',
          lastRun: lastRun?.completedAt ?? lastRun?.createdAt ?? null,
          week: lastRun?.week ?? output?.week ?? null,
          summary:
            lastRun?.summary ??
            (output?.bias ? `${output.bias} · W${output.week ?? ''}`.trim() : null),
        };
      })
    );

    res.json(agents);
  } catch {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

router.get('/pipeline/status', async (_req: Request, res: Response) => {
  const evidence = getEvidenceConfig();
  const availableWeeks = await listEvidenceWeeks();

  res.json({
    pythonAvailable: isPythonPipelineAvailable(),
    projectWeek: getProjectWeek(),
    defaultWeek: getDefaultEvidenceWeek(availableWeeks),
    availableWeeks,
    githubConfigured: evidence.githubConfigured,
    evidenceRepo: evidence.githubRepo,
    canRunAgentsOnServer: isPythonPipelineAvailable(),
    canViewEvidenceFromGitHub: true,
    evidenceSource: 'public_github',
    agents: FULL_PIPELINE_ORDER.map((id) => ({
      id,
      scriptAvailable: isAgentScriptAvailable(id),
    })),
  });
});

router.get('/pipeline/report/:agentId', async (req: Request, res: Response) => {
  try {
    const agentId = String(req.params.agentId) as Exclude<PipelineAgentId, 'fetch'>;
    const week = Number(req.query.week) || getDefaultWeek();

    if (!['almanac', 'macro', 'technical', 'llm', 'final'].includes(agentId)) {
      res.status(400).json({ error: 'Invalid agent id for report' });
      return;
    }

    const localReport = readAgentReport(agentId, week);
    if (localReport) {
      res.json({
        week,
        source: 'scripts_output',
        report: {
          filename: localReport.filename,
          markdown: localReport.markdown,
          bias: extractBiasFromMarkdown(localReport.markdown),
          extras: localReport.extras ?? {},
        },
      });
      return;
    }

    const evidenceReport = await readEvidenceAgentReport(agentId, week);
    if (evidenceReport) {
      res.json({
        week,
        source: evidenceReport.source,
        report: {
          filename: evidenceReport.filename,
          markdown: evidenceReport.markdown,
          bias: extractBiasFromMarkdown(evidenceReport.markdown),
          repoPath: evidenceReport.repoPath,
          extras: evidenceReport.extras ?? {},
        },
      });
      return;
    }

    const availableWeeks = await listEvidenceWeeks();
    res.json({
      week,
      report: null,
      availableWeeks,
      defaultWeek: getDefaultEvidenceWeek(availableWeeks),
      message:
        'No report found for this week yet. GitHub Actions updates evidence every week — try another week or reload after the workflow runs.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read report';
    res.status(500).json({ error: message });
  }
});

router.post('/pipeline/run-all', async (req: Request, res: Response) => {
  try {
    const parsed = weekSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const week = parsed.data.week ?? getDefaultWeek();

    if (!isPythonPipelineAvailable()) {
      res.status(503).json({ error: 'Python scripts not found on server' });
      return;
    }

    const results = await runFullPipeline(week, { noPush: true });

    for (const result of results) {
      if (!result.success) continue;

      if (result.agentId === 'fetch') continue;

      const report = readAgentReport(
        result.agentId as Exclude<PipelineAgentId, 'fetch'>,
        week
      );

      if (report) {
        await saveAgentRun(result.agentId, week, 'completed', {
          week,
          filename: report.filename,
          markdown: report.markdown,
          bias: extractBiasFromMarkdown(report.markdown),
          extras: report.extras,
        }, extractBiasFromMarkdown(report.markdown) ?? undefined);
      }
    }

    const failed = results.find((r) => !r.success);

    if (failed) {
      res.status(502).json({
        week,
        error: failed.message,
        results: results.map((r) => ({
          agentId: r.agentId,
          success: r.success,
          message: r.message,
        })),
        stderr: failed.stderr.slice(-1500),
      });
      return;
    }

    res.json({
      week,
      success: true,
      results: results.map((r) => ({
        agentId: r.agentId,
        success: r.success,
        message: r.message,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    res.status(500).json({ error: message });
  }
});

router.post('/:agentId/run', async (req: Request, res: Response) => {
  try {
    const agentId = pipelineIdForAgent(String(req.params.agentId));
    if (!agentId || agentId === 'fetch') {
      res.status(400).json({ error: 'Use /api/evidence/run for weekly fetch' });
      return;
    }

    const parsed = weekSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const week = parsed.data.week ?? getDefaultWeek();

    if (!isAgentScriptAvailable(agentId)) {
      res.status(503).json({ error: `Script not available for ${agentId}` });
      return;
    }

    const result = await runAgentPipeline(agentId, week, { noPush: true });

    if (!result.success) {
      await saveAgentRun(agentId, week, 'error', {
        week,
        stderr: result.stderr,
        stdout: result.stdout,
      }, result.message);

      res.status(502).json({
        error: result.message,
        stdout: result.stdout.slice(-2000),
        stderr: result.stderr.slice(-2000),
      });
      return;
    }

    const report = readAgentReport(
      agentId as Exclude<PipelineAgentId, 'fetch'>,
      week
    );

    const bias = report ? extractBiasFromMarkdown(report.markdown) : null;

    const run = await saveAgentRun(
      agentId,
      week,
      'completed',
      {
        week,
        filename: report?.filename,
        markdown: report?.markdown,
        bias,
        extras: report?.extras,
      },
      bias ?? `${agentId} completed W${week}`
    );

    res.json({
      week,
      runId: run._id,
      bias,
      report: report
        ? {
            filename: report.filename,
            markdown: report.markdown,
            extras: report.extras ?? {},
          }
        : null,
      pipeline: {
        message: result.message,
        stdout: result.stdout.slice(-2000),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent run failed';
    res.status(500).json({ error: message });
  }
});

router.get('/macro/report', async (_req: Request, res: Response) => {
  try {
    const week = getDefaultWeek();
    const fromScript = readAgentReport('macro', week);
    const lastRun = await AgentRun.findOne({ agentId: 'macro', status: 'completed' })
      .sort({ createdAt: -1 })
      .lean();

    if (fromScript) {
      res.json({
        week,
        report: {
          markdown: fromScript.markdown,
          filename: fromScript.filename,
          bias: extractBiasFromMarkdown(fromScript.markdown),
        },
        savedAt: lastRun?.completedAt ?? lastRun?.createdAt ?? null,
        runId: lastRun?._id,
      });
      return;
    }

    if (!lastRun?.output) {
      res.json({ report: null });
      return;
    }

    res.json({
      report: lastRun.output,
      savedAt: lastRun.completedAt ?? lastRun.createdAt,
      runId: lastRun._id,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch macro report' });
  }
});

router.post('/macro/report', async (req: Request, res: Response) => {
  try {
    const parsed = macroReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const report = parsed.data;
    const now = new Date();

    const run = await AgentRun.create({
      agentId: 'macro',
      status: 'completed',
      summary: `${report.macroBias} · ${report.weekOf}`,
      output: report,
      startedAt: now,
      completedAt: now,
    });

    res.status(201).json({
      report,
      savedAt: run.completedAt,
      runId: run._id,
    });
  } catch {
    res.status(500).json({ error: 'Failed to save macro report' });
  }
});

router.get('/macro/evidence', async (_req: Request, res: Response) => {
  try {
    const evidence = await getMacroEvidenceFromCollection();
    res.json(evidence);
  } catch {
    res.status(500).json({ error: 'Failed to fetch macro evidence' });
  }
});

router.post('/macro/fetch-live', async (_req: Request, res: Response) => {
  try {
    const { fetch: fetchResult, evidence } = await fetchLiveMacroData();
    res.json({ fetch: fetchResult, evidence });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Live fetch failed';
    res.status(502).json({ error: message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const meta = AGENT_META.find((a) => a.id === req.params.id);
    if (!meta) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const runs = await AgentRun.find({ agentId: meta.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const week = getDefaultWeek();
    const latestReport = UI_AGENT_IDS.includes(meta.id as (typeof UI_AGENT_IDS)[number])
      ? readAgentReport(meta.id as Exclude<PipelineAgentId, 'fetch'>, week)
      : null;

    res.json({
      ...meta,
      scriptAvailable: isAgentScriptAvailable(meta.id as PipelineAgentId),
      runs,
      latestReport: latestReport
        ? {
            filename: latestReport.filename,
            markdown: latestReport.markdown,
            bias: extractBiasFromMarkdown(latestReport.markdown),
          }
        : null,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch agent details' });
  }
});

export default router;
