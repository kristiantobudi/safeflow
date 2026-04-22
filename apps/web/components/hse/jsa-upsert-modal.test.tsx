import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsaUpsertModal } from './jsa-upsert-modal';
import { useCreateJsa } from '@/store/jsa/query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useCreateJsa hook
jest.mock('@/store/jsa/query', () => ({
  useCreateJsa: jest.fn(),
  parseServerValidationErrors: jest.fn(),
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

describe('JsaUpsertModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockCreateMutation = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCreateJsa as jest.Mock).mockReturnValue(mockCreateMutation);
  });

  it('should render modal with correct title', () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Buat JSA Baru')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/Jenis Kegiatan \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lokasi Kegiatan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tanggal Dibuat/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Referensi HIRAC/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Pelaksana Utama/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/HSE In Charge/i)).toBeInTheDocument();
  });

  it('should render all APD checkboxes', () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/Safety Helmet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safety Shoes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safety Gloves/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safety Glasses/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safety Vest/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Body Harness/i)).toBeInTheDocument();
  });

  it('should render submit and cancel buttons', () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buat JSA/i })).toBeInTheDocument();
  });

  it('should show loading state when submitting', () => {
    mockCreateMutation.isPending = true;
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /Menyimpan.../i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Menyimpan.../i })).toBeDisabled();
  });

  it('should call onOpenChange with false when cancel is clicked', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    await userEvent.click(screen.getByRole('button', { name: /Batal/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onOpenChange with false when close button is clicked', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await userEvent.click(closeButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should validate required fields on submit', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    await userEvent.click(screen.getByRole('button', { name: /Buat JSA/i }));

    expect(mockCreateMutation.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/Jenis kegiatan wajib diisi/i)).toBeInTheDocument();
  });

  it('should validate minimum length for jenisKegiatan', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const jenisKegiatanInput = screen.getByLabelText(/Jenis Kegiatan \*/i);
    await userEvent.type(jenisKegiatanInput, 'AB');
    await userEvent.click(screen.getByRole('button', { name: /Buat JSA/i }));

    expect(await screen.findByText(/Jenis kegiatan minimal 3 karakter/i)).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const jenisKegiatanInput = screen.getByLabelText(/Jenis Kegiatan \*/i);
    await userEvent.type(jenisKegiatanInput, 'Pekerjaan Las');

    await userEvent.click(screen.getByRole('button', { name: /Buat JSA/i }));

    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          jenisKegiatan: 'Pekerjaan Las',
        }),
      );
    });
  });

  it('should check APD checkboxes', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const safetyHelmetCheckbox = screen.getByLabelText(/Safety Helmet/i);
    await userEvent.click(safetyHelmetCheckbox);

    expect(safetyHelmetCheckbox).toBeChecked();
  });

  it('should close modal and reset form on successful submission', async () => {
    mockCreateMutation.mutate.mockImplementation((data, callbacks) => {
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    });

    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const jenisKegiatanInput = screen.getByLabelText(/Jenis Kegiatan \*/i);
    await userEvent.type(jenisKegiatanInput, 'Pekerjaan Las');

    await userEvent.click(screen.getByRole('button', { name: /Buat JSA/i }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should not render when open is false', () => {
    render(<JsaUpsertModal open={false} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText('Buat JSA Baru')).not.toBeInTheDocument();
  });

  it('should display APD Lainnya input field', () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/APD Lainnya/i)).toBeInTheDocument();
  });

  it('should handle optional fields correctly', async () => {
    render(<JsaUpsertModal open={true} onOpenChange={mockOnOpenChange} />, {
      wrapper: createWrapper(),
    });

    const lokasiInput = screen.getByLabelText(/Lokasi Kegiatan/i);
    await userEvent.type(lokasiInput, 'Workshop Area B');

    const submitButton = screen.getByRole('button', { name: /Buat JSA/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateMutation.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          lokasiKegiatan: 'Workshop Area B',
        }),
      );
    });
  });
});