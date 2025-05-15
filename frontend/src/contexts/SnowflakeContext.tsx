import React, { createContext, useContext, useState, useEffect } from 'react';
import { SnowflakeConnection } from '../types/snowflakeTypes';
import { useSnowflakeService } from '../services/snowflakeService';

interface SnowflakeContextType {
  connections: SnowflakeConnection[];
  selectedConnection: SnowflakeConnection | null;
  loading: boolean;
  error: string | null;
  selectConnection: (id: string | number) => void;
}

const SnowflakeContext = createContext<SnowflakeContextType | undefined>(undefined);

export const SnowflakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    connections,
    selectedConnection,
    loading,
    error,
    selectConnection,
    loadConnections
  } = useSnowflakeService();



  return (
    <SnowflakeContext.Provider value={{
      connections,
      selectedConnection,
      loading,
      error,
      selectConnection
    }}>
      {children}
    </SnowflakeContext.Provider>
  );
};

export const useSnowflakeContext = () => {
  const context = useContext(SnowflakeContext);
  if (context === undefined) {
    throw new Error('useSnowflakeContext must be used within a SnowflakeProvider');
  }
  return context;
};
