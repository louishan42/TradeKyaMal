import { PageHeader } from '@/components/PageHeader';
import { EvidenceWeekBrowser } from '@/components/EvidenceWeekBrowser';

export default function AlmanacAgentPage() {
  return (
    <div>
      <PageHeader title="Almanac Agent" description="Weekly pipeline files." />
      <EvidenceWeekBrowser agentFilter="almanac" />
    </div>
  );
}
