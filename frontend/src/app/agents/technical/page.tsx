import { PageHeader } from '@/components/PageHeader';
import { EvidenceWeekBrowser } from '@/components/EvidenceWeekBrowser';

export default function TechnicalAgentPage() {
  return (
    <div>
      <PageHeader title="Technical Agent" description="Weekly pipeline files." />
      <EvidenceWeekBrowser agentFilter="technical" />
    </div>
  );
}
