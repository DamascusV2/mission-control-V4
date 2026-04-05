export type Agent = {
  id: string;
  name: string;
  role: string;
  location: string;
  focus: string;
  status: string;
};

export type TeamData = {
  mission: string;
  principles: string[];
  agents: Agent[];
};

export type ProjectLink = {
  label: string;
  href: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: number;
  lastUpdated: string;
  links?: ProjectLink[];
};

export type Task = {
  id: string;
  title: string;
  owner: string;
  ownerType: string;
  description: string;
  tags?: string[];
  due?: string;
  priority?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type TaskColumn = {
  id: string;
  title: string;
  tasks: Task[];
};

export type TaskBoardData = {
  activity: {
    id: string;
    timestamp: string;
    summary: string;
  }[];
  columns: TaskColumn[];
};

export type ModuleState = "Not Started" | "In Progress" | "Live" | "Blocked";

export type ModuleStatus = {
  id: string;
  name: string;
  owner: string;
  state: ModuleState;
  updated: string;
  notes: string;
  blocker?: string | null;
};

export type ActivityEntry = {
  id: string;
  timestamp: string;
  summary: string;
  owner: string;
};

export type LiveSystemCheck = {
  id: string;
  label: string;
  status: string;
  detail: string;
  timestamp?: string;
};

export type LiveAgentStatus = Agent & {
  presence?: string;
  workload?: string;
  lastUpdate?: string | null;
};

export type LiveStatusPayload = {
  systemHealth?: LiveSystemCheck[];
  agents?: LiveAgentStatus[];
  activity?: ActivityEntry[];
  build?: ModuleStatus[];
  runtime?: ModuleStatus[];
  vectorMap?: ModuleMapEntry[];
  vectorQueue?: QueueItem[];
};

export type StatusPayload = {
  build: ModuleStatus[];
  runtime: ModuleStatus[];
  activity: ActivityEntry[];
  __live?: LiveStatusPayload;
};

export type ModuleMapEntry = {
  id: string;
  module: string;
  phase: string;
  owner: string;
  state: ModuleState;
  notes: string;
  links?: string[];
  dependencies?: string[];
};

export type QueueItem = {
  id: string;
  title: string;
  owner: string;
  state: ModuleState;
  eta: string;
  notes?: string;
};

export type VectorPayload = {
  map: ModuleMapEntry[];
  queue: QueueItem[];
};

export type DeploymentEntry = {
  id: string;
  timestamp: string;
  summary: string;
  owner: string;
  artifact?: string;
  notes?: string;
};

export type AutomationEvent = {
  id: string;
  timestamp: string;
  summary: string;
  channel: string;
  status: string;
};

export type DeployPayload = {
  releases: DeploymentEntry[];
  automation: AutomationEvent[];
};
