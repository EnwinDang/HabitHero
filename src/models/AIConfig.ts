export interface AIConfig {
  timeWeight: number;
  energyWeight: number;
  historyWeight: number;
  userPreferenceWeight: number;
  worldProgressWeight: number;
  randomVariance: number;
  maxSuggestions: number;
}
