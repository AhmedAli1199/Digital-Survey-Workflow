'use client';

import { createContext, useContext, ReactNode } from 'react';
import { UserRole } from '@/lib/supabase/types';

type WatermarkContextType = {
  userId: string;
  userRole: UserRole;
  companyName: string;
};

const WatermarkContext = createContext<WatermarkContextType | null>(null);

export function WatermarkProvider({
  children,
  userId,
  userRole,
  companyName,
}: {
  children: ReactNode;
  userId: string;
  userRole: UserRole;
  companyName: string;
}) {
  return (
    <WatermarkContext.Provider value={{ userId, userRole, companyName }}>
      {children}
    </WatermarkContext.Provider>
  );
}

export function useWatermark() {
  const context = useContext(WatermarkContext);
  if (!context) {
    throw new Error('useWatermark must be used within a WatermarkProvider');
  }
  return context;
}
