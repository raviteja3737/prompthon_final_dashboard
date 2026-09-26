export interface Team {
  id: string;
  name: string;
  members: string;
  tag?: string;
  created_at?: string;
}

export interface Jury {
  id: string;
  name: string;
  email: string;
  password?: string;
  password_plain?: string;
  created_at?: string;
}

export interface EvaluationCriteria {
  innovation: number;
  tech: number;
  feasibility: number;
  presentation: number;
}

export interface Evaluation {
  id: string;
  teamId?: string;
  team_id?: string;
  juryId?: string;
  jury_id?: string;
  juryEmail?: string;
  jury_email?: string;
  round: number;
  criteria?: EvaluationCriteria;
  innovation?: number;
  tech?: number;
  feasibility?: number;
  presentation?: number;
  total: number;
  remarks?: string;
  timestamp?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompetitionSettings {
  id: string;
  current_active_round: number;
  round_1_locked: boolean;
  round_2_started: boolean;
  leaderboard_visible?: boolean;
  updated_at?: string;
}

export interface LeaderboardEntry extends Team {
  r1Avg: number | null;
  r1Count: number;
  r2Avg: number | null;
  r2Count: number;
  overallScore: number;
  displayScore: number;
}
