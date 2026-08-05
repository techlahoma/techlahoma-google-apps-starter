import type {
  OptionId,
  PollOption,
  PollState,
  PollSummary,
  TallyResult,
  VoteRecord,
} from './types';

export const POLL_QUESTION =
  "Which fictional business should tonight's CRM become?";

export const POLL_OPTIONS: PollOption[] = [
  {
    id: 'bike-repair',
    label: 'Bike repair',
    description: 'Local bicycle service & gear maintenance',
    icon: '🚲',
    color: '#4285F4', // Google Blue
  },
  {
    id: 'home-services',
    label: 'Home services',
    description: 'Residential plumbing, electrical & upkeep',
    icon: '🛠️',
    color: '#EA4335', // Google Red
  },
  {
    id: 'food-truck',
    label: 'Food truck',
    description: 'Mobile gourmet food & event catering',
    icon: '🚚',
    color: '#FBBC04', // Google Yellow
  },
  {
    id: 'community-events',
    label: 'Community events',
    description: 'Neighborhood gatherings & workshop management',
    icon: '🎉',
    color: '#34A853', // Google Green
  },
];

export const STORAGE_KEY = 'room_pulse_state_v1';
export const VOTER_KEY = 'room_pulse_voter_id_v1';
export const CHANNEL_NAME = 'room_pulse_channel_v1';

export function getOrCreateVoterId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'voter-ssr-fallback';
  }
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = `voter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}

export function getDefaultState(): PollState {
  return {
    votes: [],
    lastUpdated: Date.now(),
  };
}

export function loadState(): PollState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return getDefaultState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as PollState;
    if (parsed && Array.isArray(parsed.votes)) {
      return parsed;
    }
  } catch {
    // Ignore error and fallback to default
  }
  return getDefaultState();
}

export function saveState(state: PollState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota or error
  }
}

export function getVoterChoice(state: PollState): OptionId | null {
  const voterId = getOrCreateVoterId();
  const userVote = state.votes.find(
    v => !v.isSynthetic && v.voterId === voterId,
  );
  return userVote ? userVote.optionId : null;
}

export function castVote(state: PollState, optionId: OptionId): PollState {
  const voterId = getOrCreateVoterId();
  // Remove prior vote from this voter profile to prevent duplicates
  const filteredVotes = state.votes.filter(
    v => v.isSynthetic || v.voterId !== voterId,
  );
  const newVote: VoteRecord = {
    id: `vote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    optionId,
    timestamp: Date.now(),
    isSynthetic: false,
    voterId,
  };
  const updatedState: PollState = {
    votes: [...filteredVotes, newVote],
    lastUpdated: Date.now(),
  };
  saveState(updatedState);
  broadcastStateChange(updatedState);
  return updatedState;
}

export function addSyntheticVotes(state: PollState): PollState {
  // Deterministic batch of demo votes labeled SYNTHETIC DEMO VOTES
  // +10 total votes: Bike: 3, Home: 2, Food Truck: 4, Community: 1
  const batchTime = Date.now();
  const syntheticBatch: VoteRecord[] = [
    {
      id: `synth-${batchTime}-1`,
      optionId: 'bike-repair',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-1',
    },
    {
      id: `synth-${batchTime}-2`,
      optionId: 'bike-repair',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-2',
    },
    {
      id: `synth-${batchTime}-3`,
      optionId: 'bike-repair',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-3',
    },
    {
      id: `synth-${batchTime}-4`,
      optionId: 'home-services',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-4',
    },
    {
      id: `synth-${batchTime}-5`,
      optionId: 'home-services',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-5',
    },
    {
      id: `synth-${batchTime}-6`,
      optionId: 'food-truck',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-6',
    },
    {
      id: `synth-${batchTime}-7`,
      optionId: 'food-truck',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-7',
    },
    {
      id: `synth-${batchTime}-8`,
      optionId: 'food-truck',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-8',
    },
    {
      id: `synth-${batchTime}-9`,
      optionId: 'food-truck',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-9',
    },
    {
      id: `synth-${batchTime}-10`,
      optionId: 'community-events',
      timestamp: batchTime,
      isSynthetic: true,
      voterId: 'synth-10',
    },
  ];

  const updatedState: PollState = {
    votes: [...state.votes, ...syntheticBatch],
    lastUpdated: Date.now(),
  };
  saveState(updatedState);
  broadcastStateChange(updatedState);
  return updatedState;
}

export function resetVotes(): PollState {
  const newState = getDefaultState();
  saveState(newState);
  broadcastStateChange(newState);
  return newState;
}

export function computeSummary(state: PollState): PollSummary {
  const totalVotes = state.votes.length;
  const syntheticVotesCount = state.votes.filter(v => v.isSynthetic).length;
  const userVotesCount = totalVotes - syntheticVotesCount;

  const counts: Record<OptionId, number> = {
    'bike-repair': 0,
    'home-services': 0,
    'food-truck': 0,
    'community-events': 0,
  };

  for (const v of state.votes) {
    if (counts[v.optionId] !== undefined) {
      counts[v.optionId] += 1;
    }
  }

  let maxCount = 0;
  for (const optId of Object.keys(counts) as OptionId[]) {
    if (counts[optId] > maxCount) {
      maxCount = counts[optId];
    }
  }

  const leaders: OptionId[] = [];
  if (maxCount > 0) {
    for (const optId of Object.keys(counts) as OptionId[]) {
      if (counts[optId] === maxCount) {
        leaders.push(optId);
      }
    }
  }

  const isTie = leaders.length > 1;
  const leaderId = !isTie && leaders.length === 1 ? leaders[0]! : null;
  const leaderOption = leaderId
    ? POLL_OPTIONS.find(o => o.id === leaderId)
    : null;

  const tally: TallyResult[] = POLL_OPTIONS.map(opt => {
    const count = counts[opt.id];
    const percentage =
      totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return {
      optionId: opt.id,
      label: opt.label,
      icon: opt.icon,
      color: opt.color,
      count,
      percentage,
      isLeader: Boolean(leaderId && opt.id === leaderId),
    };
  });

  return {
    totalVotes,
    syntheticVotesCount,
    userVotesCount,
    tally,
    leaderId,
    leaderLabel: leaderOption ? leaderOption.label : null,
    isTie,
    tiedOptionIds: isTie ? leaders : [],
    hasVotes: totalVotes > 0,
  };
}

// BroadcastChannel and Storage Fallback Sync
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

function broadcastStateChange(state: PollState): void {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({type: 'STATE_UPDATE', state});
    } catch {
      // Fallback handles it via localStorage setItem
    }
  }
}

export function subscribeToStateChanges(
  onChange: (state: PollState) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleBcMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'STATE_UPDATE' && event.data.state) {
      onChange(event.data.state);
    }
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const updated = loadState();
      onChange(updated);
    }
  };

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      const updated = loadState();
      onChange(updated);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }
  window.addEventListener('storage', handleStorageEvent);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Periodic poll fallback for edge-case browser tab sync
  const pollInterval = setInterval(() => {
    const currentState = loadState();
    onChange(currentState);
  }, 2000);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(pollInterval);
  };
}
