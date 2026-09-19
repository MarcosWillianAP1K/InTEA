import { ThemeProvider } from "./shared/providers/theme-provider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-800">
        <div className="rounded-xl bg-white p-8 shadow-md text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-2">
            InTEA Frontend
          </h1>
          <p className="text-slate-600">
            Ambiente configurado com React 19 + Vite + Tailwind CSS v4 +
            TypeScript
          </p>
        </div>
      </div>
    </ThemeProvider>
  );
}
