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
import Merchants from "./pages/Merchants";
import Reports from "./pages/Reports";
import MyLinks from "./pages/MyLinks";
import Messages from "./pages/Messages";
import Landing from "./pages/Landing";

function Protected({ children, perm }) {
  const { user, loading, isStaffPanel, can } = useAuth();
  if (loading)
    return (
      <div className="loader">
        <div className="spinner" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (perm && isStaffPanel && !can(perm, "view")) return <Navigate to="/" replace />;
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
      <Route path="/" element={<Protected perm="dashboard"><Dashboard /></Protected>} />
      <Route path="/affiliates" element={<Protected perm="affiliates"><Affiliates /></Protected>} />
      <Route path="/my-links" element={<Protected><MyLinks /></Protected>} />
      <Route path="/groups" element={<Protected perm="affiliate_groups"><Groups /></Protected>} />
      <Route path="/reports" element={<Protected perm="reports"><Reports /></Protected>} />
      <Route path="/players" element={<Protected perm="players"><Players /></Protected>} />
      <Route path="/withdrawals" element={<Protected perm="withdrawals"><Withdrawals /></Protected>} />
      <Route path="/messages" element={<Protected perm="messages"><Messages /></Protected>} />
      <Route path="/activities" element={<Protected perm="activities"><Activities /></Protected>} />
      <Route path="/users" element={<Protected perm="users"><Users /></Protected>} />
      <Route path="/permissions" element={<Protected perm="permissions"><Permissions /></Protected>} />
      <Route path="/merchants" element={<Protected perm="merchants"><Merchants /></Protected>} />
      <Route path="/settings" element={<Protected perm="settings"><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
