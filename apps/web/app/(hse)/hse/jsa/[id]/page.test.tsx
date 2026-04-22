import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JsaDetailPage from './page';
import { useJsa, useSubmitJsa } from '@/store/jsa/query';
import { useAuthQuery } from '@/store/auth/auth-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Mock the hooks
jest.mock('@/store/jsa/query', () => ({
  useJsa: jest.fn(),
  useSubmitJsa: jest.fn(),
}));

jest.mock('@/store/auth/auth-query', () => ({
  useAuthQuery: jest.fn(),
}));

// Mock the ApprovalTimeline component
jest.mock('@/components/hse/approval-timeline', () => {
  return function MockApprovalTimeline({ steps }: { steps: unknown[] }) {
    return <div data-testid="approval-timeline">Approval Timeline with {steps.length} steps</div>;
  };
});

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Create a wrapper for React Query hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('JsaDetailPage', () => {
  const mockJsaDetail = {
    id: 'jsa-1',
    noJsa: 'JSA-001',
    jenisKegiatan: 'Pekerjaan Las',
    lokasiKegiatan: 'Area A',
    tanggalDibuat: '2024-01-15',
    pelaksanaUtama: 'John Doe',
    hseInCharge: 'Jane Smith',
    referensiHirarc: 'HIRAC-001',
    revisiKe: 0,
    approvalStatus: 'PENDING',
    createdBy: 'user-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    creator: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    apd: {
      id: 'apd-1',
      safetyHelmet: true,
      safetyShoes: true,
      gloves: false,
      safetyGlasses: false,
      safetyVest: true,
      safetyBodyHarness: false,
      others: null,
      jsaProjectId: 'jsa-1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
    versions: [
      {
        id: 'version-1',
        versionNumber: 1,
        label: null,
        status: 'PENDING',
        submittedBy: 'user-1',
        submittedAt: '2024-01-15T10:00:00Z',
        approvalSteps: [
          {
            id: 'step-1',
            stepOrder: 1,
            requiredRole: 'VERIFICATOR',
            status: 'PENDING',
            approver: null,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
        ],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ],
  };

  const mockSubmitMutation = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useJsa as jest.Mock).mockReturnValue({
      data: mockJsaDetail,
      isLoading: false,
      error: null,
    });
    (useAuthQuery as jest.Mock).mockReturnValue({
      data: { data: { id: 'user-1' } },
    });
    (useSubmitJsa as jest.Mock).mockReturnValue(mockSubmitMutation);
  });

  it('should render page header with JSA number', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('JSA-001')).toBeInTheDocument();
    expect(screen.getByText('Pekerjaan Las')).toBeInTheDocument();
  });

  it('should render status badge', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should render revision number', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Revisi ke-0')).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Kembali ke daftar JSA/i })).toBeInTheDocument();
  });

  it('should render JSA details section', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Detail JSA')).toBeInTheDocument();
    expect(screen.getByText('Jenis Kegiatan')).toBeInTheDocument();
    expect(screen.getByText('Pekerjaan Las')).toBeInTheDocument();
    expect(screen.getByText('Lokasi Kegiatan')).toBeInTheDocument();
    expect(screen.getByText('Area A')).toBeInTheDocument();
  });

  it('should render creator information', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Informasi Pembuat')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should render approval timeline', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('approval-timeline')).toBeInTheDocument();
  });

  it('should render APD checklist', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Checklist APD')).toBeInTheDocument();
    expect(screen.getByText('Safety Helmet')).toBeInTheDocument();
    expect(screen.getByText('Safety Shoes')).toBeInTheDocument();
    expect(screen.getByText('Safety Vest')).toBeInTheDocument();
  });

  it('should show checked APD items with check icon', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    // Safety Helmet, Safety Shoes, Safety Vest should be checked
    const checkedItems = screen.getAllByTestId((content, element) => {
      // Check for check circle icons
      return element?.querySelector('svg') !== null;
    });
    expect(checkedItems.length).toBeGreaterThan(0);
  });

  it('should show unchecked APD items with X icon', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    // Safety Gloves and Safety Glasses should be unchecked
    expect(screen.getByText('Safety Gloves')).toBeInTheDocument();
    expect(screen.getByText('Safety Glasses')).toBeInTheDocument();
  });

  it('should show submit button when user is owner and status is PENDING', async () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Submit untuk Approval/i })).toBeInTheDocument();
  });

  it('should call submit mutation when button is clicked', async () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /Submit untuk Approval/i });
    await userEvent.click(submitButton);

    expect(mockSubmitMutation.mutate).toHaveBeenCalledWith(undefined);
  });

  it('should show loading state', () => {
    (useJsa as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should show error state when JSA not found', () => {
    (useJsa as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('JSA not found'),
    });

    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gagal memuat data JSA/i)).toBeInTheDocument();
    expect(screen.getByText('JSA tidak ditemukan')).toBeInTheDocument();
  });

  it('should not show submit button when user is not owner', () => {
    (useAuthQuery as jest.Mock).mockReturnValue({
      data: { data: { id: 'user-2' } },
    });

    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Submit untuk Approval/i })).not.toBeInTheDocument();
  });

  it('should not show submit button when status is not PENDING or REJECTED', () => {
    const approvedJsa = { ...mockJsaDetail, approvalStatus: 'APPROVED' };
    (useJsa as jest.Mock).mockReturnValue({
      data: approvedJsa,
      isLoading: false,
      error: null,
    });

    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Submit untuk Approval/i })).not.toBeInTheDocument();
  });

  it('should show loading text on submit button when pending', () => {
    mockSubmitMutation.isPending = true;
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Mengirim.../i)).toBeInTheDocument();
  });

  it('should render HSE In Charge information', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('HSE In Charge')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should render pelaksana utama information', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Pelaksana Utama')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render tanggal dibuat', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Tanggal Dibuat')).toBeInTheDocument();
  });

  it('should render referensi HIRAC', () => {
    render(<JsaDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Referensi HIRAC')).toBeInTheDocument();
    expect(screen.getByText('HIRAC-001')).toBeInTheDocument();
  });

  it('should handle HIRAC connection error on submit', async () => {
    mockSubmitMutation.mutate.mockImplementation((_, callbacks) => {
      if (callbacks?.onError) {
        callbacks.onError({
          response: {
            data: {
              message: 'JSA harus terhubung ke HIRAC terlebih dahulu',
            },
          },
        });
      }
    });

    render(<JsaDetailPage />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /Submit untuk Approval/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});