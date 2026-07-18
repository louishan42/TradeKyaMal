import { PageHeader } from '@/components/PageHeader';
import { AgentPipelinePanel } from '@/components/AgentPipelinePanel';

export default function AlmanacAgentPage() {
  return (
    <div>
      <PageHeader
        title="Almanac Agent"
        description="Seasonal patterns, calendar events, and index momentum — automated R3 pipeline."
      />
      <AgentPipelinePanel
        agentId="almanac"
        title="Almanac Agent (R3)"
        description="Runs run_almanac_agent.py — fetches index/sector performance, Nasdaq calendar, seasonal patterns, and produces an ALMANAC BIAS."
      />
    </div>
  );
}
