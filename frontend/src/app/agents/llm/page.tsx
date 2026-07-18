import { PageHeader } from '@/components/PageHeader';
import { EvidenceWeekBrowser } from '@/components/EvidenceWeekBrowser';

export default function LlmIntegrationPage() {
  return (
    <div>
      <PageHeader title="LLM Integration" description="LLM synthesis and final prediction files." />
      <EvidenceWeekBrowser agentFilter={['llm', 'final']} />
    </div>
  );
}
