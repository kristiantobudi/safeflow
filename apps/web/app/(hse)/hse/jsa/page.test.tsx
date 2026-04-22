import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JsaPage from './page';
import { useJsaList } from '@/store/jsa/query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useJsaList hook
jest.mock('@/store/jsa/query', () => ({
  useJsaList: jest.fn(),
}));

// Mock the JsaUpsertModal component
jest.mock('@/components/hse/jsa-upsert-modal', () => {
  return function MockJsaUpsertModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    if (!open) return null;
    return (
      <div data-testid="jsa-upsert-modal">
        <button onClick={() => onOpenChange(false)}>Close Modal</button>
      </div>
    );
  };
});

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

describe('JsaPage', () => {
  const mockJsaList = [
    {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      lokasiKegiatan: 'Area A',
      tanggalDibuat: '2024-01-15',
      revisiKe: 0,
      approvalStatus: 'PENDING',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      creator: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
      versions: [],
    },
    {
      id: 'jsa-2',
      noJsa: 'JSA-002',
      jenisKegiatan: 'Pekerjaan Listrik',
      lokasiKegiatan: 'Area B',
      tanggalDibuat: '2024-01-16',
      revisiKe: 1,
      approvalStatus: 'APPROVED',
      createdAt: '2024-01-16T10:00:00Z',
      updatedAt: '2024-01-16T10:00:00Z',
      creator: {
        id: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      },
      versions: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useJsaList as jest.Mock).mockReturnValue({
      data: mockJsaList,
      isLoading: false,
      error: null,
    });
  });

  it('should render page title and description', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Job Safety Analysis')).toBeInTheDocument();
    expect(screen.getByText(/Manajemen analisis keselamatan kerja/i)).toBeInTheDocument();
  });

  it('should render create button', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /Buat JSA Baru/i })).toBeInTheDocument();
  });

  it('should render statistics cards', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Total JSA')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/Cari jenis kegiatan atau lokasi/i)).toBeInTheDocument();
  });

  it('should render data table with JSA items', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText('JSA-001')).toBeInTheDocument();
    expect(screen.getByText('Pekerjaan Las')).toBeInTheDocument();
    expect(screen.getByText('Area A')).toBeInTheDocument();
    expect(screen.getByText('JSA-002')).toBeInTheDocument();
    expect(screen.getByText('Pekerjaan Listrik')).toBeInTheDocument();
  });

  it('should render status badges', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
  });

  it('should render detail buttons', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getAllByRole('button', { name: /Detail/i })).toHaveLength(2);
  });

  it('should open create modal when button is clicked', async () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    const createButton = screen.getByRole('button', { name: /Buat JSA Baru/i });
    await userEvent.click(createButton);

    expect(screen.getByTestId('jsa-upsert-modal')).toBeInTheDocument();
  });

  it('should filter JSA list based on search', async () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    const searchInput = screen.getByPlaceholderText(/Cari jenis kegiatan atau lokasi/i);
    await userEvent.type(searchInput, 'Las');

    // JSA-002 should not be visible when searching for "Las"
    expect(screen.queryByText('Pekerjaan Listrik')).not.toBeInTheDocument();
    expect(screen.getByText('Pekerjaan Las')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useJsaList as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    render(<JsaPage />, { wrapper: createWrapper() });

    // Loading state should be rendered by DataTableCustoms
    expect(screen.getByTestId('data-table-loading')).toBeInTheDocument();
  });

  it('should show error state', () => {
    const error = new Error('Network Error');
    (useJsaList as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: error,
    });

    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Gagal memuat data JSA/i)).toBeInTheDocument();
  });

  it('should show empty state when no JSA records', () => {
    (useJsaList as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<JsaPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Total JSA')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should calculate correct statistics', () => {
    render(<JsaPage />, { wrapper: createWrapper() });

    // 1 PENDING, 1 APPROVED, 0 SUBMITTED, 0 REJECTED
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});