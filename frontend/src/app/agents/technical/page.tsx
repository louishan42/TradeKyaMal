import { PageHeader } from '@/components/PageHeader';
import { AgentPipelinePanel } from '@/components/AgentPipelinePanel';

export default function TechnicalAgentPage() {
  return (
    <div>
      <PageHeader
        title="Technical Agent"
        description="Weekly EMA structure, support/resistance, and breadth — automated R5 pipeline."
      />
      <AgentPipelinePanel
        agentId="technical"
        title="Technical Agent (R5)"
        description="Runs run_technical_agent.py — analyses SPX, NDX, IWM weekly EMAs, generates charts, and outputs a FINAL TECHNICAL BIAS."
      />
    </div>
  );
}
