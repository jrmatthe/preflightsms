import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UpgradePrompt from '../../components/UpgradePrompt';

// ── Section 3.4: Tier Upgrade Prompt ──

function renderUP(props = {}) {
  const onNavigateToSubscription = props.onNavigateToSubscription ?? vi.fn();
  const onDismiss = props.onDismiss ?? vi.fn();

  const { container } = render(
    <UpgradePrompt
      feature={props.feature ?? 'Flight Following'}
      message={props.message ?? undefined}
      onNavigateToSubscription={onNavigateToSubscription}
      onDismiss={onDismiss}
    />
  );

  return { container, onNavigateToSubscription, onDismiss };
}

describe('UpgradePrompt', () => {
  // 3.4.1 Modal shows with correct header text
  it('renders "This Feature is Available on a Paid Plan" header', () => {
    renderUP();
    expect(screen.getByText('This Feature is Available on a Paid Plan')).toBeInTheDocument();
  });

  // 3.4.1 Shows feature name in message
  it('includes the feature name in the default message', () => {
    renderUP({ feature: 'Flight Following' });
    expect(screen.getAllByText(/Flight Following/)[0]).toBeInTheDocument();
  });

  // Custom message
  it('displays custom message when provided', () => {
    renderUP({ message: 'Aircraft limit reached. Free plan supports 1 aircraft.' });
    expect(screen.getByText('Aircraft limit reached. Free plan supports 1 aircraft.')).toBeInTheDocument();
  });

  // 3.4.1 Shows "See Plan Options" and "Maybe Later" buttons
  it('shows "See Plan Options" and "Maybe Later" buttons', () => {
    renderUP();
    expect(screen.getByText('See Plan Options')).toBeInTheDocument();
    expect(screen.getByText('Maybe Later')).toBeInTheDocument();
  });

  // 3.4.3 "See Plan Options" calls onNavigateToSubscription
  it('"See Plan Options" calls onNavigateToSubscription', () => {
    const { onNavigateToSubscription } = renderUP();
    fireEvent.click(screen.getByText('See Plan Options'));
    expect(onNavigateToSubscription).toHaveBeenCalledTimes(1);
  });

  // 3.4.4 "Maybe Later" calls onDismiss
  it('"Maybe Later" calls onDismiss', () => {
    const { onDismiss } = renderUP();
    fireEvent.click(screen.getByText('Maybe Later'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // 3.4.2 "Compare plans" toggles comparison table
  it('"Compare plans" button toggles plan comparison table', () => {
    renderUP();
    // Click "Compare plans"
    fireEvent.click(screen.getByText('Compare plans'));

    // Now comparison table visible - use getAllByText for items that appear in multiple contexts
    expect(screen.getAllByText(/Starter/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Professional/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\$149/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/\$349/).length).toBeGreaterThanOrEqual(1);

    // Click "Hide comparison" to collapse
    fireEvent.click(screen.getByText('Hide comparison'));
  });

  // Renders as a fixed overlay
  it('renders as a fixed overlay', () => {
    const { container } = renderUP();
    const overlay = container.firstChild;
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.zIndex).toBe('9999');
  });
});
