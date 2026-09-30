// Legacy competition service - kept as stub to avoid import errors.
// All data access now goes through the new modular services in src/services/.
export const competitionService = {
  async getTeams() { return []; },
  async getJuries() { return []; },
  async getEvaluations() { return []; },
  async getSettings() { return null; },
  async updateSettings() { return; },
  subscribeToAll(_onUpdate: () => void) { return () => {}; },
};
