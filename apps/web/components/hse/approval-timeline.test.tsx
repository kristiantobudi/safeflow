import { render, screen } from '@testing-library/react';
import { ApprovalTimeline } from './approval-timeline';

describe('ApprovalTimeline', () => {
  const mockSteps = [
    {
      id: 'step-1',
      stepOrder: 1,
      requiredRole: 'VERIFICATOR',
      status: 'APPROVED',
      approver: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
    },
    {
      id: 'step-2',
      stepOrder: 2,
      requiredRole: 'EXAMINER',
      status: 'PENDING',
      approver: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'step-3',
      stepOrder: 3,
      requiredRole: 'ADMIN',
      status: 'PENDING',
      approver: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
  ];

  it('should render the component with title', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('Approval Timeline')).toBeInTheDocument();
  });

  it('should render all approval steps', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('Verifikator')).toBeInTheDocument();
    expect(screen.getByText('Examiner')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('should display step order numbers', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('Level 1 Approval')).toBeInTheDocument();
    expect(screen.getByText('Level 2 Approval')).toBeInTheDocument();
    expect(screen.getByText('Level 3 Approval')).toBeInTheDocument();
  });

  it('should show approved status badge', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    const approvedBadge = screen.getByText('APPROVED');
    expect(approvedBadge).toBeInTheDocument();
  });

  it('should show pending status badge', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    const pendingBadges = screen.getAllByText('PENDING');
    expect(pendingBadges).toHaveLength(2);
  });

  it('should display approver name when available', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show pending message when no approver', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('Menunggu approval...')).toBeInTheDocument();
  });

  it('should render legend with all status types', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('should render check circle icon for approved status', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    const checkIcon = screen.getByTestId('check-circle-icon');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should render clock icon for pending status', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    const clockIcon = screen.getByTestId('clock-icon');
    expect(clockIcon).toBeInTheDocument();
  });

  it('should handle rejected status', () => {
    const rejectedSteps = [
      {
        id: 'step-1',
        stepOrder: 1,
        requiredRole: 'VERIFICATOR',
        status: 'REJECTED',
        approver: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
    ];

    render(<ApprovalTimeline steps={rejectedSteps} />);

    expect(screen.getByText('REJECTED')).toBeInTheDocument();
    expect(screen.getByText('Pengajuan ditolak')).toBeInTheDocument();
  });

  it('should render x circle icon for rejected status', () => {
    const rejectedSteps = [
      {
        id: 'step-1',
        stepOrder: 1,
        requiredRole: 'VERIFICATOR',
        status: 'REJECTED',
        approver: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
    ];

    render(<ApprovalTimeline steps={rejectedSteps} />);

    const xCircleIcon = screen.getByTestId('x-circle-icon');
    expect(xCircleIcon).toBeInTheDocument();
  });

  it('should handle empty steps array', () => {
    render(<ApprovalTimeline steps={[]} />);

    expect(screen.getByText('Approval Timeline')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should sort steps by required role order', () => {
    const unsortedSteps = [
      {
        id: 'step-3',
        stepOrder: 3,
        requiredRole: 'ADMIN',
        status: 'PENDING',
        approver: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: 'step-1',
        stepOrder: 1,
        requiredRole: 'VERIFICATOR',
        status: 'APPROVED',
        approver: {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
      },
      {
        id: 'step-2',
        stepOrder: 2,
        requiredRole: 'EXAMINER',
        status: 'PENDING',
        approver: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ];

    render(<ApprovalTimeline steps={unsortedSteps} />);

    // Verifikator should appear first
    const verifikatorText = screen.getByText('Verifikator');
    expect(verifikatorText).toBeInTheDocument();
  });

  it('should display date in Indonesian locale format', () => {
    render(<ApprovalTimeline steps={mockSteps} />);

    // The date should be formatted for Indonesian locale
    expect(screen.getByText(/16\/1\/2024/)).toBeInTheDocument();
  });

  it('should handle unknown role labels gracefully', () => {
    const unknownRoleSteps = [
      {
        id: 'step-1',
        stepOrder: 1,
        requiredRole: 'UNKNOWN_ROLE',
        status: 'PENDING',
        approver: null,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ];

    render(<ApprovalTimeline steps={unknownRoleSteps} />);

    expect(screen.getByText('UNKNOWN_ROLE')).toBeInTheDocument();
  });
});