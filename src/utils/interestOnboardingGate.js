const hasUserId = (value) => value !== undefined && value !== null && value !== '';

export const shouldPreservePreparedInterestOnboarding = ({
  shouldShowInterestOnboardingScreen = false,
  interestOnboardingUserId = null,
} = {}) =>
  Boolean(shouldShowInterestOnboardingScreen && hasUserId(interestOnboardingUserId));

export const resolveInterestOnboardingUserId = ({
  interestOnboardingUserId = null,
  currentUser = null,
} = {}) => {
  if (hasUserId(interestOnboardingUserId)) {
    return String(interestOnboardingUserId);
  }

  if (hasUserId(currentUser?.userId)) {
    return String(currentUser.userId);
  }

  return null;
};
