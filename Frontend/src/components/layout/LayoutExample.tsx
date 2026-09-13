import type { ReactNode } from 'react';

interface LayoutExampleProps {
  children: ReactNode;
}

export function LayoutExample({ children }: LayoutExampleProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <header className="p-4 border-b border-slate-200 bg-white shadow-xs">
        <h1 className="text-xl font-bold text-blue-600">InTEA Layout Base</h1>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
