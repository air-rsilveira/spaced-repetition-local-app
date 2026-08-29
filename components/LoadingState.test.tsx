/**
 * LoadingState.test.tsx — Unit tests for the LoadingState component.
 *
 * Tests verify that:
 * 1. The component renders with the default label "Loading…"
 * 2. The component renders with a custom label when provided
 * 3. The component exposes role="status" for accessibility
 * 4. The component has aria-live="polite" for announcement behavior
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect } from "vitest";
import { render, screen } from '@testing-library/react';
import LoadingState from './LoadingState';

describe('LoadingState', () => {
  it('renders with the default label "Loading…"', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders with a custom label when provided', () => {
    render(<LoadingState label="Loading deck…" />);
    expect(screen.getByText('Loading deck…')).toBeInTheDocument();
  });

  it('exposes role="status" for accessibility', () => {
    render(<LoadingState />);
    const section = screen.getByRole('status');
    expect(section).toBeInTheDocument();
  });

  it('has aria-live="polite" for announcement behavior', () => {
    render(<LoadingState />);
    const section = screen.getByRole('status');
    expect(section).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-label matching the label text', () => {
    const customLabel = 'Loading review session…';
    render(<LoadingState label={customLabel} />);
    const section = screen.getByRole('status');
    expect(section).toHaveAttribute('aria-label', customLabel);
  });

  it('renders a loading spinner', () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders centered content', () => {
    const { container } = render(<LoadingState />);
    const section = container.querySelector('section');
    expect(section).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });
});
