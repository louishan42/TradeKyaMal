import { PageHeader } from '@/components/PageHeader';
import { MacroAgentReport } from '@/components/MacroAgentReport';
import { EvidenceWeekBrowser } from '@/components/EvidenceWeekBrowser';

export default function MacroAgentPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Macro Agent" description="Live data and weekly pipeline output." />
      <MacroAgentReport />
      <EvidenceWeekBrowser agentFilter="macro" />
    </div>
  );
}
