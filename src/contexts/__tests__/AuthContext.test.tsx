import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockOnAuthStateChanged = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: () => mockSignOut(),
  getAuth: vi.fn(),
}));

vi.mock('../../firebase', () => ({
  auth: {},
}));

const { AuthProvider, useAuth } = await import('../AuthContext');

function TestComponent() {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'loaded'}</span>
      <span data-testid="user">
        {user ? user.email : 'no-user'}
      </span>
      <button data-testid="signout" onClick={signOut}>
        Sign Out
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthProvider', () => {
  it('should start in loading state', () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      return () => {};
    });

    renderWithProvider();
    expect(screen.getByTestId('loading').textContent).toBe('loading');
  });

  it('should set user when auth state changes to authenticated', () => {
    const fakeUser = { email: 'test@example.com', uid: '123' };

    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });

    renderWithProvider();
    expect(screen.getByTestId('loading').textContent).toBe('loaded');
    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('should set user to null when auth state changes to unauthenticated', () => {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null);
      return () => {};
    });

    renderWithProvider();
    expect(screen.getByTestId('loading').textContent).toBe('loaded');
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('should call firebase signOut on signOut', async () => {
    const fakeUser = { email: 'test@example.com', uid: '123' };
    mockSignOut.mockResolvedValue(undefined);

    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(fakeUser);
      return () => {};
    });

    renderWithProvider();

    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByTestId('signout'));
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('should cleanup subscription on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChanged.mockImplementation((_auth, _cb) => {
      return unsubscribe;
    });

    const { unmount } = renderWithProvider();
    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
