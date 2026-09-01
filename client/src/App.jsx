import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Pending from "./pages/Pending";
import Report from "./pages/Report";
import MyReports from "./pages/MyReports";
import InspectorDashboard from "./pages/InspectorDashboard";
import MukadamDashboard from "./pages/MukadamDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import AdminUsers from "./pages/AdminUsers";

const INSPECTORS = ["inspector", "admin"];

/** Guarded route rendered inside the app shell. */
const Private = ({ allow, children }) => (
  <ProtectedRoute allow={allow}>
    <AppShell>{children}</AppShell>
  </ProtectedRoute>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/pending" element={<Pending />} />

          {/* Citizen */}
          <Route path="/report" element={<Private allow={["citizen", "admin"]}><Report /></Private>} />
          <Route path="/my-reports" element={<Private allow={["citizen", "admin"]}><MyReports /></Private>} />

          {/* Staff */}
          <Route path="/inspector" element={<Private allow={INSPECTORS}><InspectorDashboard /></Private>} />
          <Route path="/mukadam" element={<Private allow={["mukadam", "admin"]}><MukadamDashboard /></Private>} />
          <Route path="/worker" element={<Private allow={["safai_sevak", "admin"]}><WorkerDashboard /></Private>} />
          <Route path="/admin/users" element={<Private allow={["admin"]}><AdminUsers /></Private>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
