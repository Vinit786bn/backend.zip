import { create } from 'zustand';

export interface UserProfile {
  name?: string;
  email?: string;
  balance?: number;
  kycStatus?: string;
  uid?: string;
}

export type UserRole = 'landowner' | 'company' | null;

interface AppState {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  userRole: UserRole;
  isGlobalLoading: boolean;
  
  setAuth: (isAuthenticated: boolean, profile: UserProfile | null, role: UserRole) => void;
  setUserRole: (role: UserRole) => void;
  setGlobalLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  userProfile: null,
  userRole: null,
  isGlobalLoading: false,

  setAuth: (isAuthenticated, profile, role) => set({ isAuthenticated, userProfile: profile, userRole: role }),
  setUserRole: (role) => set({ userRole: role }),
  setGlobalLoading: (isLoading) => set({ isGlobalLoading: isLoading }),
  logout: () => set({ isAuthenticated: false, userProfile: null, userRole: null }),
}));
