'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PtwDetailPage from './page';
import { usePtw, useSubmitPtw } from '@/store/ptw/query';
import { useAuthQuery } from '@/store/auth/auth-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApprovalTimeline } from '@/components/hse/approval-timeline';
import { toast } from 'sonner';

// Mock the hooks
jest.mock('@/store/ptw/query', () => ({
  usePtw: jest.fn(),
  useSubmitPtw: jest.fn(),
}));

jest.mock('@/store/auth/auth-query', () => ({
  useAuthQuery: jest.fn(),
}));

// Mock the ApprovalTimeline component
jest.mock('@/components/hse/approval-timeline', () => ({
  ApprovalTimeline: jest.fn(({ steps }) => (
    <div data-testid="approval-timeline">Approval Timeline with {steps?.length || 0} steps</div>
  )),
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ptw-1' }),
  useRouter: () => ({ push: mockPush }),
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

describe('PtwDetailPage', () => {
  const mockPtwDetail = {
    id: 'ptw-1',
    noPtw: 'PTW-001',
    judulPekerjaan: 'Pekerjaan Las',
    lokasiPekerjaan: 'Area A',
    tanggalMulai: '2024-01-15',
    tanggalSelesai: '2024-01-20',
    approvalStatus: 'PENDING',
    createdBy: 'user-1',
    keteranganTambahan: 'Harap gunakan APD lengkap',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    creator: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    jsaProject: {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      approvalStatus: 'APPROVED',
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
        ],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ],
  };

  const mockSubmitMutation = {
    mutate: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePtw as jest.Mock).mockReturnValue({
      data: mockPtwDetail,
      isLoading: false,
      error: null,
    });
    (useAuthQuery as jest.Mock).mockReturnValue({
      data: { data: { id: 'user-1' } },
    });
    (useSubmitPtw as jest.Mock).mockReturnValue(mockSubmitMutation);
  });

  it('should render page title with PTW number', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/PTW-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Las/i)).toBeInTheDocument();
  });

  it('should render status badge', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('should render back button', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Kembali ke daftar PTW/i })).toBeInTheDocument();
  });

  it('should render PTW details section', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Detail PTW/i)).toBeInTheDocument();
    expect(screen.getByText(/Judul Pekerjaan/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Las/i)).toBeInTheDocument();
    expect(screen.getByText(/Lokasi Pekerjaan/i)).toBeInTheDocument();
    expect(screen.getByText(/Area A/i)).toBeInTheDocument();
  });

  it('should render date information', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Tanggal Mulai/i)).toBeInTheDocument();
    expect(screen.getByText(/Tanggal Selesai/i)).toBeInTheDocument();
  });

  it('should render keterangan tambahan', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Keterangan Tambahan/i)).toBeInTheDocument();
    expect(screen.getByText(/Harap gunakan APD lengkap/i)).toBeInTheDocument();
  });

  it('should render JSA related information', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/JSA Terkait/i)).toBeInTheDocument();
    expect(screen.getByText(/JSA-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Las/i)).toBeInTheDocument();
  });

  it('should render creator information', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Informasi Pembuat/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
  });

  it('should render approval timeline', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('approval-timeline')).toBeInTheDocument();
  });

  it('should show loading skeleton when data is loading', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('skeleton-loading')).toBeInTheDocument();
  });

  it('should show error state when data fetch fails', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('PTW tidak ditemukan'),
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gagal memuat data PTW/i)).toBeInTheDocument();
    expect(screen.getByText(/PTW tidak ditemukan/i)).toBeInTheDocument();
  });

  it('should show error state when PTW is not found', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gagal memuat data PTW/i)).toBeInTheDocument();
  });

  it('should show submit button when user is owner and PTW is PENDING', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Submit untuk Approval/i })).toBeInTheDocument();
  });

  it('should show submit button when user is owner and PTW is REJECTED', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: { ...mockPtwDetail, approvalStatus: 'REJECTED' },
      isLoading: false,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Submit untuk Approval/i })).toBeInTheDocument();
  });

  it('should not show submit button when user is not owner', () => {
    (useAuthQuery as jest.Mock).mockReturnValue({
      data: { data: { id: 'user-2' } },
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Submit untuk Approval/i })).not.toBeInTheDocument();
  });

  it('should not show submit button when PTW is APPROVED', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: { ...mockPtwDetail, approvalStatus: 'APPROVED' },
      isLoading: false,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Submit untuk Approval/i })).not.toBeInTheDocument();
  });

  it('should not show submit button when PTW is SUBMITTED', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: { ...mockPtwDetail, approvalStatus: 'SUBMITTED' },
      isLoading: false,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.queryByRole('button', { name: /Submit untuk Approval/i })).not.toBeInTheDocument();
  });

  it('should call submit mutation when submit button is clicked', async () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /Submit untuk Approval/i });
    await userEvent.click(submitButton);

    expect(mockSubmitMutation.mutate).toHaveBeenCalled();
  });

  it('should show loading state when submitting', () => {
    mockSubmitMutation.isPending = true;

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Mengirim.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mengirim.../i })).toBeDisabled();
  });

  it('should render link to JSA detail page', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Lihat Detail JSA/i })).toBeInTheDocument();
  });

  it('should handle missing optional fields gracefully', () => {
    (usePtw as jest.Mock).mockReturnValue({
      data: {
        ...mockPtwDetail,
        lokasiPekerjaan: null,
        tanggalMulai: null,
        tanggalSelesai: null,
        keteranganTambahan: null,
        jsaProject: null,
      },
      isLoading: false,
      error: null,
    });

    render(<PtwDetailPage />, { wrapper: createWrapper() });

    // Should show "-" for null values
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByText(/JSA tidak tersedia/i)).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(<PtwDetailPage />, { wrapper: createWrapper() });

    // Dates should be formatted in Indonesian locale
    expect(screen.getByText(/15 Januari 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/20 Januari 2024/i)).toBeInTheDocument();
  });
});