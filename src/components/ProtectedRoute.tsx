import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthManager';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" dir="rtl">
        <div className="text-lg font-medium text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
