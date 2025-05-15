export interface SnowflakeConnection {
  id: string;
  name: string;
  type: 'SNOWFLAKE' | 'LOCAL';
  user: string;
  password: string;
  account: string;
  warehouse: string;
  role: string;
  isSSO: boolean;
  database?: string;
  schema?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnowflakeConnectionForm {
  name: string;
  user: string;
  password: string;
  account: string;
  warehouse: string;
  role: string;
  isSSO: boolean;
  database?: string;
  schema?: string;
}
