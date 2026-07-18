export type AgentType = 'almanac' | 'macro' | 'technical' | 'llm' | 'final';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  lastRun?: string;
}
