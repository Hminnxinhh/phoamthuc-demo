// Future portal/ad integration boundary. No SDK, tracking or network requests.
export const platform = {
  onGameplayStart() {},
  onGameplayStop() {},
  onMilestone(_name) {},
  async requestRewardedAd() { return { available: false, rewarded: false }; },
};
