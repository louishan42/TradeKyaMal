import { PageHeader } from '@/components/PageHeader';
import { AgentPipelinePanel } from '@/components/AgentPipelinePanel';

export default function LlmIntegrationPage() {
  return (
    <div>
      <PageHeader
        title="LLM Integration"
        description="OpenAI + Gemini synthesis across Macro, Almanac, and Technical reports — R8 calibration suite."
      />
      <div className="space-y-8">
        <AgentPipelinePanel
          agentId="llm"
          title="LLM Integration (R8)"
          description="Runs run_llm_integration.py — sends all three agent reports to OpenAI and Gemini, builds agreement matrix and llm_responses JSON."
        />

        <AgentPipelinePanel
          agentId="final"
          title="Final Prediction"
          description="Runs run_final_prediction.py — combines macro, almanac, technical, LLM, and human score into the final weekly prediction."
          showFullPipeline={false}
        />
      </div>
    </div>
  );
}
