import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { EvalListPage } from "@/pages/EvalListPage";
import { EvalDetailPage } from "@/pages/EvalDetailPage";
import { CartPage } from "@/pages/CartPage";
import { ComparisonPage } from "@/pages/ComparisonPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/evals/:systemGroup" element={<EvalListPage />} />
            <Route
              path="/evals/:systemGroup/:evalId"
              element={<EvalDetailPage />}
            />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/compare/:systemGroup" element={<ComparisonPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
