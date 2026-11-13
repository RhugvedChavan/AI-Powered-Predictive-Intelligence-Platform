import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { DatasetsPage } from './pages/DatasetsPage';
import { DataCleaningPage } from './pages/DataCleaningPage';
import { ExploratoryAnalysisPage } from './pages/ExploratoryAnalysisPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { PredictiveMLPage } from './pages/PredictiveMLPage';
import { BIDashboardPage } from './pages/BIDashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="cleaning" element={<DataCleaningPage />} />
            <Route path="analysis" element={<ExploratoryAnalysisPage />} />
            <Route path="assistant" element={<AIAssistantPage />} />
            <Route path="ml-studio" element={<PredictiveMLPage />} />
            <Route path="bi" element={<BIDashboardPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

