import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PtwUpsertModal } from './ptw-upsert-modal';
import { useCreatePtw, useJsaList } from '@/store/ptw/query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
jest.mock('@/store/ptw/query', () => ({
  useCreatePtw: jest.fn(),
  parseServerValidationErrors: jest.fn(),
}));

jest.mock('@/store/jsa/query', () => ({
  useJsaList: jest.fn(),
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

describe('PtwUpsertModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockCreateMutation = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  const mockJsaList = [
    {
      id: 'jsa-1',
      noJsa: 'JSA-001',
      jenisKegiatan: 'Pekerjaan Las',
      approvalStatus: 'APPROVED',
      lokasiKegiatan: 'Area A',
    },
    {
      id: 'jsa-2',
      noJsa: 'JSA-002',
      jenisKegiatan: 'Pekerjaan Listrik',
      approvalStatus: 'APPROVED',
      lokasiKegiatan: 'Area B',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useCreatePtw as jest.Mock).mockReturnValue(mockCreateMutation);
    (useJsaList as jest.Mock).mockReturnValue({
      data: mockJsaList,
      isLoading: false,
    });
  });

  it('should render modal with correct title', () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Buat PTW Baru')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/Judul Pekerjaan \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/JSA Terkait \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lokasi Pekerjaan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Mulai/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Selesai/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Keterangan Tambahan/i)).toBeInTheDocument();
  });

  it('should render submit and cancel buttons', () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat PTW/i })).toBeInTheDocument();
  });

  it('should show loading state when submitting', () => {
    mockCreateMutation.isPending = true;
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /Menyimpan.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menyimpan.../i })).toBeDisabled();
  });

  it('should call onOpenChange with false when cancel is clicked', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    await userEvent.click(screen.getByRole('button', { name: /Batal/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange with false when close button is clicked', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await userEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should validate required fields on submit', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(mockCreateMutation.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/Judul pekerjaan wajib diisi/i)).toBeInTheDocument();
  });

  it('should validate minimum length for judulPekerjaan', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'AB');
    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(await screen.findByText(/Judul pekerjaan minimal 3 karakter/i)).toBeInTheDocument();
  });

  it('should validate maximum length for judulPekerjaan', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    // Create a string longer than 255 characters
    const longString = 'A'.repeat(256);
    await userEvent.type(judulPekerjaanInput, longString);
    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(await screen.findByText(/Judul pekerjaan maksimal 255 karakter/i)).toBeInTheDocument();
  });

  it('should validate JSA selection is required', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');
    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(await screen.findByText(/JSA terkait wajib dipilih/i)).toBeInTheDocument();
  });

  it('should validate tanggalSelesai is after tanggalMulai', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');

    const tanggalMulaiInput = screen.getByLabelText(/Tanggal Mulai/i);
    await userEvent.type(tanggalMulaiInput, '2024-01-20');

    const tanggalSelesaiInput = screen.getByLabelText(/Tanggal Selesai/i);
    await userEvent.type(tanggalSelesaiInput, '2024-01-15');

    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(await screen.findByText(/Tanggal selesai harus setelah tanggal mulai/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');

    // Select JSA from dropdown
    const jsaSelect = screen.getByRole('combobox', { name: /JSA Terkait/i });
    await userEvent.click(jsaSelect);
    await userEvent.click(screen.getByText(/JSA-001 - Pekerjaan Las/i));

    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          judulPekerjaan: 'Pekerjaan Las',
          jsaProjectId: 'jsa-1',
        }),
      );
    });
  });

  it('should display selected JSA information', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const jsaSelect = screen.getByRole('combobox', { name: /JSA Terkait/i });
    await userEvent.click(jsaSelect);
    await userEvent.click(screen.getByText(/JSA-001 - Pekerjaan Las/i));

    // Check that JSA info card appears
    expect(screen.getByText(/Informasi JSA Terpilih/i)).toBeInTheDocument();
    expect(screen.getByText(/JSA-001/i)).toBeInTheDocument();
    expect(screen.getByText(/Pekerjaan Las/i)).toBeInTheDocument();
  });

  it('should show info message when no approved JSA is available', async () => {
    (useJsaList as jest.Mock).mockReturnValue({
      data: [
        {
          id: 'jsa-1',
          noJsa: 'JSA-001',
          jenisKegiatan: 'Pekerjaan Pending',
          approvalStatus: 'PENDING',
        },
      ],
      isLoading: false,
    });

    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/Tidak ada JSA yang tersedia/i)).toBeInTheDocument();
    expect(screen.getByText(/Anda perlu memiliki JSA dengan status "APPROVED"/i)).toBeInTheDocument();
  });

  it('should show loading state for JSA dropdown', async () => {
    (useJsaList as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByPlaceholderText(/Memuat daftar JSA.../i)).toBeInTheDocument();
  });

  it('should close modal and reset form on successful submission', async () => {
    mockCreateMutation.mutate.mockImplementation((data, callbacks) => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    });

    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');

    const jsaSelect = screen.getByRole('combobox', { name: /JSA Terkait/i });
    await userEvent.click(jsaSelect);
    await userEvent.click(screen.getByText(/JSA-001 - Pekerjaan Las/i));

    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should not render when open is false', () => {
    render(<PtwUpsertModal open={false} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText('Buat PTW Baru')).not.toBeInTheDocument();
  });

  it('should handle optional fields correctly', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');

    const lokasiInput = screen.getByLabelText(/Lokasi Pekerjaan/i);
    await userEvent.type(lokasiInput, 'Workshop Area B');

    const jsaSelect = screen.getByRole('combobox', { name: /JSA Terkait/i });
    await userEvent.click(jsaSelect);
    await userEvent.click(screen.getByText(/JSA-001 - Pekerjaan Las/i));

    const submitButton = screen.getByRole('button', { name: /Buat PTW/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          lokasiPekerjaan: 'Workshop Area B',
        }),
      );
    });
  });

  it('should validate maximum length for keteranganTambahan', async () => {
    render(<PtwUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const judulPekerjaanInput = screen.getByLabelText(/Judul Pekerjaan \*/i);
    await userEvent.type(judulPekerjaanInput, 'Pekerjaan Las');

    const jsaSelect = screen.getByRole('combobox', { name: /JSA Terkait/i });
    await userEvent.click(jsaSelect);
    await userEvent.click(screen.getByText(/JSA-001 - Pekerjaan Las/i));

    const keteranganInput = screen.getByLabelText(/Keterangan Tambahan/i);
    // Create a string longer than 1000 characters
    const longString = 'A'.repeat(1001);
    await userEvent.type(keteranganInput, longString);

    await userEvent.click(screen.getByRole('button', { name: /Buat PTW/i }));

    expect(await screen.findByText(/Keterangan maksimal 1000 karakter/i)).toBeInTheDocument();
  });
});