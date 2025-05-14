'use client';
export function useAuth() { return { currentUser: null, loading: false }; }
export function AuthProvider({ children }) { return <>{children}</>; }