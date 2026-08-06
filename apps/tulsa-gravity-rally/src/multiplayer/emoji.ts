export interface EmojiOption {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const EMOJI_ALLOWLIST: EmojiOption[] = [
  {id: 'bison', emoji: '🦬', label: 'Bison', color: '#c85a32'},
  {id: 'rocket', emoji: '🚀', label: 'Rocket', color: '#ff5722'},
  {id: 'turtle', emoji: '🐢', label: 'Turtle', color: '#4caf50'},
  {id: 'fox', emoji: '🦊', label: 'Fox', color: '#ff9800'},
  {id: 'octopus', emoji: '🐙', label: 'Octopus', color: '#e91e63'},
  {id: 'cactus', emoji: '🌵', label: 'Cactus', color: '#8bc34a'},
  {id: 'rainbow', emoji: '🌈', label: 'Rainbow', color: '#00bcd4'},
  {id: 'balloon', emoji: '🎈', label: 'Balloon', color: '#f44336'},
  {id: 'pizza', emoji: '🍕', label: 'Pizza', color: '#ffc107'},
  {id: 'gamepad', emoji: '🎮', label: 'Gamepad', color: '#9c27b0'},
  {id: 'lightning', emoji: '⚡', label: 'Lightning', color: '#ffeb3b'},
  {id: 'satellite', emoji: '🛰️', label: 'Satellite', color: '#607d8b'},
];
