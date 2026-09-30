export type UserRole = 'platform_admin' | 'organizer' | 'jury' | 'public';

export interface PlatformAdmin {
  user_id: string;
  email: string;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'closed';
  public_token: string;
  leaderboard_enabled: boolean;
  organizer_email: string;
  created_by?: string;
  created_at: string;
  // Joined counts
  teams_count?: number;
  juries_count?: number;
  rounds_count?: number;
  evaluations_count?: number;
  participants_count?: number;
}

export interface EventMember {
  event_id: string;
  user_id: string;
  role: 'organizer' | 'jury';
  display_name: string;
  email: string;
  created_at: string;
  // Joined
  submission_count?: number;
  total_teams?: number;
}

export interface Round {
  id: string;
  event_id: string;
  seq: number;
  name: string;
  status: 'draft' | 'active' | 'locked';
  weight: number;
  created_at: string;
  // Joined
  criteria?: Criterion[];
  max_marks_total?: number;
}

export interface Criterion {
  id: string;
  round_id: string;
  label: string;
  max_marks: number;
  seq: number;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  tag: string;
  extra: Record<string, unknown>;
  created_at: string;
  // Joined
  participants?: Participant[];
  members?: string; // Backwards compat
}

export interface Participant {
  id: string;
  event_id: string;
  team_id: string;
  name: string;
  email: string;
  phone: string;
  extra: Record<string, unknown>;
}

export interface Evaluation {
  id: string;
  event_id: string;
  round_id: string;
  team_id: string;
  jury_id: string;
  scores: Record<string, number>; // { criteria_id: mark }
  total: number;
  remarks: string;
  submitted_at: string;
  updated_at: string;
  // Joined
  team_name?: string;
  jury_name?: string;
  jury_email?: string;
  round_name?: string;
  round_seq?: number;
}

export interface LeaderboardRank {
  event_id: string;
  team_id: string;
  team_name: string;
  rank: number | null;
}

export interface PublicLeaderboardEntry {
  event_name: string;
  rank: number;
  team_name: string;
}

export interface AuditLog {
  id: string;
  event_id: string | null;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  at: string;
  // Joined
  actor_email?: string;
}

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface CSVImportRow {
  team_name: string;
  members?: string;
  email?: string;
  phone?: string;
  tag?: string;
  [key: string]: string | undefined;
}

export interface CreatedCredentials {
  email: string;
  password: string;
  loginUrl?: string;
  eventId?: string;
  slug?: string;
  juryId?: string;
}
