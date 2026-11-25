import { Routes } from "./routes";
import { ThemeProvider } from "./shared/providers/theme-provider";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";

/**
 * Root React application component configuring routing, theme provider, and global error boundary.
 *
 * @returns Rendered application root.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <ErrorBoundary>
          <Routes />
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  );
}
