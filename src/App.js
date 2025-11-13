import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Dashboard from './components/Dashboard/Dashboard';
import TenantList from './components/Tenants/TenantList';
import TenantCreateForm from './components/Tenants/TenantCreateForm';
import AppointmentList from './components/Appointments/AppointmentList';
import VoiceAgentTest from './components/VoiceAgent/VoiceAgentTest';
import TwilioIntegration from './components/TwilioIntegration/TwilioIntegration';
import AgentManagement from './components/Agents/AgentManagement';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

// Main Layout Component
const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <main>
        {children}
      </main>
    </div>
  );
};

// Home Component
const Home = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return <Navigate to="/login" />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <RegisterForm />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenants" 
              element={
                <ProtectedRoute>
                  <TenantList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tenants/create" 
              element={
                <ProtectedRoute>
                  <TenantCreateForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appointments" 
              element={
                <ProtectedRoute>
                  <AppointmentList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents" 
              element={
                <ProtectedRoute>
                  <AgentManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/voice-agent" 
              element={
                <ProtectedRoute>
                  <VoiceAgentTest />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/twilio-integration" 
              element={
                <ProtectedRoute>
                  <TwilioIntegration />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
