export type OptionId =
  'bike-repair' | 'home-services' | 'food-truck' | 'community-events';

export interface PollOption {
  id: OptionId;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface VoteRecord {
  id: string;
  optionId: OptionId;
  timestamp: number;
  isSynthetic: boolean;
  voterId: string;
}

export interface PollState {
  votes: VoteRecord[];
  lastUpdated: number;
}

export interface TallyResult {
  optionId: OptionId;
  label: string;
  icon: string;
  color: string;
  count: number;
  percentage: number;
  isLeader: boolean;
}

export interface PollSummary {
  totalVotes: number;
  syntheticVotesCount: number;
  userVotesCount: number;
  tally: TallyResult[];
  leaderId: OptionId | null;
  leaderLabel: string | null;
  isTie: boolean;
  tiedOptionIds: OptionId[];
  hasVotes: boolean;
}
