import { Routes } from "./routes";
import { ThemeProvider } from "./shared/providers/theme-provider";
import { BrowserRouter } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <Routes />
      </ThemeProvider>
    </BrowserRouter>
  );
}
