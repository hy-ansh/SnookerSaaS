import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import PlayerLayout from './layouts/PlayerLayout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminSettings from './pages/Admin/Settings';
import AdminOrganizations from './pages/Admin/Organizations';
import AdminPlans from './pages/Admin/Plans';
import AdminAds from './pages/Admin/Ads';

import OwnerDashboard from './pages/Owner/Dashboard';
import OwnerAccounting from './pages/Owner/Accounting';
import OwnerAnalytics from './pages/Owner/Analytics';
import OwnerDues from './pages/Owner/Dues';
import OwnerInventoryPOS from './pages/Owner/InventoryPOS';
import OwnerPayments from './pages/Owner/Payments';
import OwnerAssetMaintenance from './pages/Owner/AssetMaintenance';
import OwnerSubscription from './pages/Owner/Subscription';
import OwnerOnboarding from './pages/Owner/Onboarding';
import OwnerSettings from './pages/Owner/Settings';

import StaffLiveSession from './pages/Staff/LiveSession';
import StaffOverview from './pages/Staff/Overview';
import StaffSessionHistory from './pages/Staff/SessionHistory';
import StaffPlayerAnalytics from './pages/Staff/PlayerAnalytics';
import StaffDues from './pages/Staff/Dues';

import PlayerDashboard from './pages/Player/Dashboard';
import PlayerMatches from './pages/Player/Matches';
import PlayerLeaderboard from './pages/Player/Leaderboard';
import PlayerDues from './pages/Player/Dues';
import PlayerWallet from './pages/Player/Wallet';

import TermsAndConditions from './pages/Legal/TermsAndConditions';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import RefundPolicy from './pages/Legal/RefundPolicy';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/refund" element={<RefundPolicy />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="ads" element={<AdminAds />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Store Owner Routes */}
        <Route element={<ProtectedRoute allowedRoles={['STORE_OWNER', 'ADMIN']} />}>
          <Route path="/owner" element={<DashboardLayout />}>
            <Route index element={<OwnerDashboard />} />
            <Route path="accounting" element={<OwnerAccounting />} />
            <Route path="analytics" element={<OwnerAnalytics />} />
            <Route path="dues" element={<OwnerDues />} />
            <Route path="pos" element={<OwnerInventoryPOS />} />
            <Route path="payments" element={<OwnerPayments />} />
            <Route path="maintenance" element={<OwnerAssetMaintenance />} />
            <Route path="subscription" element={<OwnerSubscription />} />
            <Route path="live/:id" element={<StaffLiveSession />} />
            <Route path="onboarding" element={<OwnerOnboarding />} />
            <Route path="settings" element={<OwnerSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['STAFF', 'STORE_OWNER', 'ADMIN']} />}>
          <Route path="/staff" element={<DashboardLayout />}>
            <Route index element={<StaffOverview />} />
            <Route path="sessions" element={<StaffSessionHistory />} />
            <Route path="players" element={<StaffPlayerAnalytics />} />
            <Route path="dues" element={<StaffDues />} />
            <Route path="pos" element={<OwnerInventoryPOS />} />
            <Route path="live/:id" element={<StaffLiveSession />} />
          </Route>
        </Route>

        {/* Player Routes */}
        <Route element={<ProtectedRoute allowedRoles={['PLAYER']} />}>
          <Route path="/player" element={<PlayerLayout />}>
            <Route index element={<PlayerDashboard />} />
            <Route path="matches" element={<PlayerMatches />} />
            <Route path="leaderboard" element={<PlayerLeaderboard />} />
            <Route path="dues" element={<PlayerDues />} />
            <Route path="wallet" element={<PlayerWallet />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
