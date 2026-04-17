import {
  resolveInterestOnboardingUserId,
  shouldPreservePreparedInterestOnboarding,
} from '../interestOnboardingGate';

describe('interestOnboardingGate', () => {
  it('preserves a prepared onboarding screen only when a user id is available', () => {
    expect(
      shouldPreservePreparedInterestOnboarding({
        shouldShowInterestOnboardingScreen: true,
        interestOnboardingUserId: '42',
      })
    ).toBe(true);

    expect(
      shouldPreservePreparedInterestOnboarding({
        shouldShowInterestOnboardingScreen: true,
        interestOnboardingUserId: null,
      })
    ).toBe(false);
  });

  it('prefers the prepared onboarding user id over async storage user info', () => {
    expect(
      resolveInterestOnboardingUserId({
        interestOnboardingUserId: '123',
        currentUser: { userId: 456 },
      })
    ).toBe('123');
  });

  it('falls back to the persisted current user id when no prepared id exists', () => {
    expect(
      resolveInterestOnboardingUserId({
        currentUser: { userId: 456 },
      })
    ).toBe('456');
  });

  it('returns null when no stable user id can be resolved', () => {
    expect(resolveInterestOnboardingUserId({})).toBeNull();
  });
});
