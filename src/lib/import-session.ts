type ImportSessionRecord = {
  id: string;
  entity: string;
  userId?: string;
  filename?: string;
  status: "pending" | "running" | "succeeded" | "failed";
  startedAt: string;
  completedAt?: string;
  processed?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  errors?: number;
  message?: string;
};

const globalStore = global as unknown as {
  __importSessions?: Map<string, ImportSessionRecord>;
};

function store() {
  if (!globalStore.__importSessions) globalStore.__importSessions = new Map();
  return globalStore.__importSessions;
}

export function putImportSession(session: ImportSessionRecord) {
  store().set(session.id, session);
}

export function getImportSession(id: string): ImportSessionRecord | undefined {
  return store().get(id);
}
