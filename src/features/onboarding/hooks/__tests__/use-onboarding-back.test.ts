/**
 * @jest-environment jsdom
 */
import { useOnboardingBack } from '@/features/onboarding/hooks/use-onboarding-back';
import { OnboardingStep } from '@/features/onboarding/types';
import { act, renderHook } from '@testing-library/react';

describe('useOnboardingBack', () => {
  it('offers no way back on the first step the user sees', () => {
    const { result } = renderHook(() => useOnboardingBack(OnboardingStep.Login));
    expect(result.current.shownStep).toBe(OnboardingStep.Login);
    expect(result.current.canGoBack).toBe(false);
  });

  it('goes back to a step seen earlier and returns to the current one after an answer', () => {
    const { result, rerender } = renderHook(({ step }) => useOnboardingBack(step), {
      initialProps: { step: OnboardingStep.Initial },
    });
    rerender({ step: OnboardingStep.Login });
    expect(result.current.canGoBack).toBe(true);

    act(() => result.current.goBack());
    expect(result.current.shownStep).toBe(OnboardingStep.Initial);
    expect(result.current.canGoBack).toBe(false);

    act(() => result.current.returnToCurrent());
    expect(result.current.shownStep).toBe(OnboardingStep.Login);
  });

  it('follows the flow when it moves on while an earlier step is shown', () => {
    const { result, rerender } = renderHook(({ step }) => useOnboardingBack(step), {
      initialProps: { step: OnboardingStep.Initial },
    });
    rerender({ step: OnboardingStep.Login });
    act(() => result.current.goBack());
    rerender({ step: OnboardingStep.PushNotifications });
    expect(result.current.shownStep).toBe(OnboardingStep.PushNotifications);
  });

  it('does not count loading screens as steps to go back to', () => {
    const { result, rerender } = renderHook(({ step }) => useOnboardingBack(step), {
      initialProps: { step: OnboardingStep.Checking },
    });
    rerender({ step: OnboardingStep.Login });
    expect(result.current.canGoBack).toBe(false);
  });
});
