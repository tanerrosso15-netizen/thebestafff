import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Affiliates from "./pages/Affiliates";
import Groups from "./pages/Groups";
import Players from "./pages/Players";
import Withdrawals from "./pages/Withdrawals";
import Activities from "./pages/Activities";
import Users from "./pages/Users";
import Permissions from "./pages/Permissions";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import MyLinks from "./pages/MyLinks";
import Messages from "./pages/Messages";
import Landing from "./pages/Landing";

function Protected({ children, adminOnly }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading)
    return (
      <div className="loader">
        <div className="spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/go" element={<Landing />} />
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/affiliates" element={<Protected><Affiliates /></Protected>} />
      <Route path="/my-links" element={<Protected><MyLinks /></Protected>} />
      <Route path="/groups" element={<Protected adminOnly><Groups /></Protected>} />
      <Route path="/reports" element={<Protected adminOnly><Reports /></Protected>} />
      <Route path="/players" element={<Protected><Players /></Protected>} />
      <Route path="/withdrawals" element={<Protected><Withdrawals /></Protected>} />
      <Route path="/messages" element={<Protected><Messages /></Protected>} />
      <Route path="/activities" element={<Protected adminOnly><Activities /></Protected>} />
      <Route path="/users" element={<Protected adminOnly><Users /></Protected>} />
      <Route path="/permissions" element={<Protected adminOnly><Permissions /></Protected>} />
      <Route path="/settings" element={<Protected adminOnly><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
