export interface Source {
  title: string;
  url: string;
  domain: string;
  favicon?: string;
}

export type ResearchPhase =
  | "idle"
  | "searching"
  | "reviewing"
  | "analyzing"
  | "finished";

export interface ResearchStep {
  phase: ResearchPhase;
  label: string;
  detail?: string;
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface Report {
  id: string;
  query: string;
  overview: string;
  sections: ReportSection[];
  sources: Source[];
  createdAt: Date;
}

/** Marketing audit score category */
export interface AuditScore {
  category: string;
  score: number;
  weight: number;
  finding: string;
}

/** Marketing command metadata attached to a session */
export interface MarketingMeta {
  commandId: string;
  commandLabel: string;
  icon: string;
  inputType: "url" | "topic" | "client" | "product";
  arg: string;
  outputFile: string;
  scores?: AuditScore[];
  overallScore?: number;
  grade?: string;
}

export interface ResearchSession {
  id: string;
  query: string;
  phase: ResearchPhase;
  steps: ResearchStep[];
  sources: Source[];
  report: Report | null;
  createdAt: Date;
  /** Present when the session was started via a /market command */
  marketing?: MarketingMeta;
}
