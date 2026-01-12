/**
 * Error Boundary Tests
 * Comprehensive tests for error boundary functionality
 */

const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');
const { ErrorBoundary, ErrorFallback, withErrorBoundary, useErrorHandler } = require('@/components/error/error-boundary');

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeAll(() => {
  console.error = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
});

// Component that throws an error
function ThrowError({ shouldThrow = false, errorMessage = 'Test error' }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return React.createElement('div', { 'data-testid': 'success' }, 'Success');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('success')).toBeInTheDocument();
  });

  test('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test component error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  test('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Callback test error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Callback test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  test('uses custom fallback when provided', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Error UI</div>;
    
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });

  test('resets error when resetErrorBoundary is called', async () => {
    // Create a component that can switch error state
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="success">Success</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Reset the error state and click try again
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    await waitFor(() => {
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });
  });

  test('resets error when resetKeys change', () => {
    let resetKey = 'key1';
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change reset key
    resetKey = 'key2';
    rerender(
      <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('success')).toBeInTheDocument();
  });

  test('shows development error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Development Error Details')).toBeInTheDocument();
    expect(screen.getByText('Development error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('shows error ID for support', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
    expect(screen.getByText(/Please include this ID when contacting support/)).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  const mockError = new Error('Test fallback error');
  const mockErrorInfo = { componentStack: 'Test component stack' };
  const mockResetError = jest.fn();
  const mockScheduleReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders error information correctly', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        errorId="test-error-id"
        resetError={mockResetError}
        scheduleReset={mockScheduleReset}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
    expect(screen.getByText('test-error-id')).toBeInTheDocument();
  });

  test('detects and handles network errors', () => {
    const networkError = new Error('Failed to fetch data from server');
    
    render(
      <ErrorFallback
        error={networkError}
        errorInfo={mockErrorInfo}
        errorId="network-error-id"
        resetError={mockResetError}
        scheduleReset={mockScheduleReset}
      />
    );

    expect(screen.getByText(/trouble connecting to our servers/i)).toBeInTheDocument();
    expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
  });

  test('detects and handles chunk loading errors', () => {
    const chunkError = new Error('Loading chunk 0 failed');
    
    render(
      <ErrorFallback
        error={chunkError}
        errorInfo={mockErrorInfo}
        errorId="chunk-error-id"
        resetError={mockResetError}
        scheduleReset={mockScheduleReset}
      />
    );

    expect(screen.getByText(/updating the app/i)).toBeInTheDocument();
    expect(screen.getByText(/reload automatically/i)).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  test('calls resetError when Try Again is clicked', () => {
    render(
      <ErrorFallback
        error={mockError}
        errorInfo={mockErrorInfo}
        errorId="reset-test-id"
        resetError={mockResetError}
        scheduleReset={mockScheduleReset}
      />
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(mockResetError).toHaveBeenCalledTimes(1);
  });

  test('schedules auto-reset for chunk errors', () => {
    const chunkError = new Error('Loading chunk failed');
    
    render(
      <ErrorFallback
        error={chunkError}
        errorInfo={mockErrorInfo}
        errorId="auto-reset-id"
        resetError={mockResetError}
        scheduleReset={mockScheduleReset}
      />
    );

    expect(mockScheduleReset).toHaveBeenCalledWith(2000);
  });
});

describe('withErrorBoundary', () => {
  test('wraps component with error boundary', () => {
    const TestComponent = () => <div data-testid="wrapped">Wrapped Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);
    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
  });

  test('handles errors in wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);

    render(<WrappedComponent />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('passes error boundary props to wrapper', () => {
    const onError = jest.fn();
    const TestComponent = () => {
      throw new Error('Props test error');
    };
    const WrappedComponent = withErrorBoundary(TestComponent, { onError });

    render(<WrappedComponent />);
    expect(onError).toHaveBeenCalled();
  });
});

describe('useErrorHandler', () => {
  function TestComponent() {
    const handleError = useErrorHandler();
    
    return (
      <button
        onClick={() => {
          try {
            throw new Error('Manual error report');
          } catch (error) {
            handleError(error as Error, { component: 'TestComponent' });
          }
        }}
      >
        Trigger Error
      </button>
    );
  }

  test('reports errors manually', () => {
    render(<TestComponent />);
    
    fireEvent.click(screen.getByText('Trigger Error'));
    
    // Verify console was called (mocked)
    expect(console.error).toHaveBeenCalledWith(
      'Manual error report:',
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Manual error report'
        }),
        errorInfo: expect.objectContaining({
          component: 'TestComponent'
        }),
        errorId: expect.stringMatching(/^error_\d+_/)
      })
    );
  });
});

describe('Error Boundary Integration', () => {
  test('works with React Router navigation', async () => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: '/' } as any;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go Home'));
    expect(window.location.href).toBe('/');
  });

  test('handles multiple nested error boundaries', () => {
    render(
      <ErrorBoundary>
        <div>Outer Boundary</div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Inner boundary error" />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Should show error from inner boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Should still show outer boundary content
    expect(screen.getByText('Outer Boundary')).toBeInTheDocument();
  });

  test('preserves error boundary isolation', () => {
    render(
      <div>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
        <ErrorBoundary>
          <div data-testid="isolated">This should still render</div>
        </ErrorBoundary>
      </div>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('isolated')).toBeInTheDocument();
  });
});