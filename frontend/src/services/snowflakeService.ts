import { useState, useEffect } from 'react';
import { SnowflakeConnection, SnowflakeConnectionForm } from '../types/snowflakeTypes';

interface SnowflakeService {
  connections: SnowflakeConnection[];
  selectedConnection: SnowflakeConnection | null;
  loading: boolean;
  error: string | null;
  loadConnections: () => Promise<void>;
  saveConnection: (connection: SnowflakeConnectionForm) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  selectConnection: (id: string | number) => void;
}

export const useSnowflakeService = (): SnowflakeService => {
  const [connections, setConnections] = useState<SnowflakeConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<SnowflakeConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading Snowflake connections...');
      // Use FastAPI endpoint
      const response = await fetch('/nlq_analytics_connections', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load connections');
      }
      const data = await response.json();
      console.log('Snowflake connections loaded:', data);
      setConnections(data);
      setSelectedConnection(data.find((c: SnowflakeConnection) => c.name === 'PUB Prod') || data[0] || null);
    } catch (error) {
      console.error('Error loading connections:', error);
      setError(error instanceof Error ? error.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const saveConnection = async (connection: SnowflakeConnectionForm) => {
    try {
      const response = await fetch('/api/snowflake/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection),
      });
      if (response.ok) {
        await loadConnections();
      }
    } catch (error) {
      console.error('Error saving connection:', error);
    }
  };

  const deleteConnection = async (id: string) => {
    try {
      const response = await fetch(`/api/snowflake/connections/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadConnections();
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
    }
  };

  const selectConnection = (id: string | number) => {
    const conn = connections.find((c: SnowflakeConnection) => c.id === id);
    if (conn) {
      setSelectedConnection(conn);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  return {
    connections,
    selectedConnection,
    loading,
    error,
    loadConnections,
    saveConnection,
    deleteConnection,
    selectConnection,
  };
};
