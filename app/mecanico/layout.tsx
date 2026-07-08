import type { Metadata } from 'next';
import { MecanicoSidebar } from '@/components/layout/MecanicoSidebar';

export const metadata: Metadata = {
  title: 'MecanicOnline — Mecánico',
};

export default function MecanicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <MecanicoSidebar />
      <main className="ml-56 flex-1 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}
