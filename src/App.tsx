import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { AttentionRequired } from "./pages/AttentionRequired";
import { ToolsCatalog } from "./pages/tools/ToolsCatalog";
import { ToolDetail } from "./pages/tools/ToolDetail";
import { AddTool } from "./pages/tools/AddTool";
import { Loans } from "./pages/loans/Loans";
import { LendTool } from "./pages/loans/LendTool";
import { ReturnTool } from "./pages/loans/ReturnTool";
import { Supplies } from "./pages/supplies/Supplies";
import { AddSupply } from "./pages/supplies/AddSupply";
import { Trailers } from "./pages/trailers/Trailers";
import { AddTrailer } from "./pages/trailers/AddTrailer";
import { TrailerDetail } from "./pages/trailers/TrailerDetail";
import { Reports } from "./pages/reports/Reports";
import { Settings } from "./pages/settings/Settings";
import { More } from "./pages/more/More";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/attention" element={<AttentionRequired />} />
            <Route path="/tools" element={<ToolsCatalog />} />
            <Route path="/tools/new" element={<AddTool />} />
            <Route path="/tools/:id" element={<ToolDetail />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<LendTool />} />
            <Route path="/loans/return" element={<ReturnTool />} />
            <Route path="/supplies" element={<Supplies />} />
            <Route path="/supplies/new" element={<AddSupply />} />
            <Route path="/trailers" element={<Trailers />} />
            <Route path="/trailers/new" element={<AddTrailer />} />
            <Route path="/trailers/:id" element={<TrailerDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
