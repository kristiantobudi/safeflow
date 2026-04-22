'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PtwPage from './page';
import { usePtwList } from '@/store/ptw/query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PtwUpsertModal } from '@/components/hse/ptw-upsert-modal';

// Mock the hooks
jest.mock('@/store/ptw/query', () => ({
  usePtwList: jest.fn(),
}));

// Mock the modal component
jest.mock('@/components/hse/ptw-upsert-modal', () => ({
  PtwUpsertModal: jest.fn(({ open, onOpenChange }) => (
    open ? <div data-testid="ptw-modal">PTW Modal</div> : null
  )),
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
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

describe('PtwPage', () => {
  const mockPtwList = [
    {
      id: 'ptw-1',
      noPtw: 'PTW-001',
      judulPekerjaan: 'Pekerjaan Las',
      lokasiPekerjaan: 'Area A',
      tanggalMulai: '2024-01-15',
      tanggalSelesai: '2024-01-20',
      approvalStatus: 'PENDING',
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
      versions: [],
    },
    {
      id: 'ptw-2',
      noPtw: 'PTW-002',
      judulPekerjaan: 'Pekerjaan Listrik',
      lokasiPekerjaan: 'Area B',
      tanggalMulai: '2024-01-16',
      tanggalSelesai: '2024-01-18',
      approvalStatus: 'APPROVED',
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      jsaProject: {
        id: 'jsa-2',
        noJsa: 'JSA-002',
        jenisKegiatan: 'Pekerjaan Listrik',
        approvalStatus: 'APPROVED',
      },
      versions: [],
    },
    {
      id: 'ptw-3',
      noPtw: 'PTW-003',
      judulPekerjaan: 'Pekerjaan Pending',
      lokasiPekerjaan: 'Area C',
      tanggalMulai: '2024-01-17',
      tanggalSelesai: '2024-01-19',
      approvalStatus: 'SUBMITTED',
      createdAt: '2024-01-17T10:00:00Z',
      updatedAt: '2024-01-17T10:00:00Z',
      creator: {
        id: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
      jsaProject: {
        id: 'jsa-3',
        noJsa: 'JSA-003',
        jenisKegiatan: 'Pekerjaan Pending',
        approvalStatus: 'APPROVED',
      },
      versions: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (usePtwList as jest.Mock).mockReturnValue({
      data: mockPtwList,
      isLoading: false,
      error: null,
    });
  });

  it('should render page title and description', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Permit to Work/i)).toBeInTheDocument();
    expect(screen.getByText(/Manajemen izin kerja dan pengajuan PTW/i)).toBeInTheDocument();
  });

  it('should render statistics cards with correct counts', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Total PTW/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total count

    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 PENDING

    expect(screen.getByText(/Submitted/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 SUBMITTED

    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 APPROVED
  });

  it('should render "Buat PTW Baru" button', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Buat PTW Baru/i })).toBeInTheDocument();
  });

  it('should open create modal when button is clicked', async () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    const createButton = screen.getByRole('button', { name: /Buat PTW Baru/i });
    await userEvent.click(createButton);

    expect(screen.getByTestId('ptw-modal')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/Cari judul pekerjaan atau lokasi.../i)).toBeInTheDocument();
  });

  it('should render data table with PTW data', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/PTW-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Las/i)).toBeInTheDocument();
    expect(screen.getByText(/PTW-002/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Listrik/i)).toBeInTheDocument();
  });

  it('should render status badges with correct styling', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    // PENDING status
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    // APPROVED status
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    // SUBMITTED status
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
  });

  it('should render detail buttons for each row', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    const detailButtons = screen.getAllByRole('button', { name: /Detail/i });
    expect(detailButtons.length).toBe(3);
  });

  it('should render JSA related information', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/JSA-001/i)).toBeInTheDocument();
    expect(screen.getByText(/JSA-002/i)).toBeInTheDocument();
  });

  it('should show loading state when data is loading', () => {
    (usePtwList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
  });

  it('should show error state when data fetch fails', () => {
    (usePtwList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network Error'),
    });

    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gagal memuat data PTW/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Error/i)).toBeInTheDocument();
  });

  it('should show empty state when no PTW records exist', () => {
    (usePtwList as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Tidak ada data/i)).toBeInTheDocument();
  });

  it('should render location and date information', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Area A/i)).toBeInTheDocument();
    expect(screen.getByText(/Area B/i)).toBeInTheDocument();
  });

  it('should render creator information in table', () => {
    render(<PtwPage />, { wrapper: createWrapper() });

    // The table should show creator info in the JSA column
    expect(screen.getByText(/\(Pekerjaan Las\)/i)).toBeInTheDocument();
  });
});