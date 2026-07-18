import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';
import { AgentPipelinePanel } from '@/components/AgentPipelinePanel';

export default function MacroAgentPage() {
  return (
    <div>
      <PageHeader
        title="Macro Agent"
        description="Live Finviz/Yahoo snapshot plus full automated macro report pipeline."
      />
      <div className="space-y-8">
        <MacroAgentReport />
        <AgentPipelinePanel
          agentId="macro"
          title="Macro Agent Report (R4)"
          description="Runs run_macro_agent.py — live Finviz futures, Yahoo sectors, macro charts, and MACRO BIAS report."
          showFullPipeline={false}
        />
      </div>
    </div>
  );
}
