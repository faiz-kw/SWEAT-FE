import { createFileRoute } from '@tanstack/react-router';
import { CommerceWorkspace } from '@/components/commerce/CommerceWorkspace';

export const Route = createFileRoute('/_shell/finance/orders')({
  component: FinanceOrdersPage,
});

function FinanceOrdersPage() {
  return (
    <div className="space-y-6">
      <CommerceWorkspace initialTab="orders" />
    </div>
  );
}
