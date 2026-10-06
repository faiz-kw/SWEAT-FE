import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_shell/finance/')({
  beforeLoad: () => {
    throw redirect({ to: '/finance/invoices' });
  },
});
