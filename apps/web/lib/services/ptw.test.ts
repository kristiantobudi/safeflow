import axiosInstance from '../axios';
import { ptwService, CreatePtwData, PtwDetail, PtwListItem } from './ptw';

// Mock axios instance
jest.mock('../axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('ptwService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPtw', () => {
    const mockPtwDetail: PtwDetail = {
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
      versions: [],
    };

    it('should create a new PTW with valid data', async () => {
      const createData: CreatePtwData = {
        judulPekerjaan: 'Pekerjaan Las',
        jsaProjectId: 'jsa-1',
        lokasiPekerjaan: 'Area A',
        tanggalMulai: '2024-01-15',
        tanggalSelesai: '2024-01-20',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockPtwDetail });

      const result = await ptwService.createPtw(createData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/ptw', createData);
      expect(result).toEqual(mockPtwDetail);
    });

    it('should create PTW with minimal data', async () => {
      const minimalData: CreatePtwData = {
        judulPekerjaan: 'Inspeksi',
        jsaProjectId: 'jsa-1',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockPtwDetail });

      const result = await ptwService.createPtw(minimalData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/ptw', minimalData);
      expect(result).toEqual(mockPtwDetail);
    });

    it('should handle API errors when creating PTW', async () => {
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(ptwService.createPtw({ judulPekerjaan: 'Test', jsaProjectId: 'jsa-1' })).rejects.toThrow('Network Error');
    });

    it('should include all optional fields when provided', async () => {
      const fullData: CreatePtwData = {
        judulPekerjaan: 'Pekerjaan Las',
        jsaProjectId: 'jsa-1',
        lokasiPekerjaan: 'Area A',
        tanggalMulai: '2024-01-15',
        tanggalSelesai: '2024-01-20',
        keteranganTambahan: 'Harap gunakan APD lengkap dan ikuti prosedur keselamatan',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockPtwDetail });

      await ptwService.createPtw(fullData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/ptw', fullData);
    });
  });

  describe('getPtwList', () => {
    const mockPtwList: PtwListItem[] = [
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
    ];

    it('should fetch all PTW records', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockPtwList });

      const result = await ptwService.getPtwList();

      expect(axiosInstance.get).toHaveBeenCalledWith('/ptw');
      expect(result).toEqual(mockPtwList);
    });

    it('should return empty array when no PTW records exist', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await ptwService.getPtwList();

      expect(result).toEqual([]);
    });

    it('should handle API errors when fetching list', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(ptwService.getPtwList()).rejects.toThrow('Network Error');
    });
  });

  describe('getPtwById', () => {
    const mockPtwDetail: PtwDetail = {
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
      versions: [],
    };

    it('should fetch PTW by ID', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockPtwDetail });

      const result = await ptwService.getPtwById('ptw-1');

      expect(axiosInstance.get).toHaveBeenCalledWith('/ptw/ptw-1');
      expect(result).toEqual(mockPtwDetail);
    });

    it('should handle 404 error when PTW not found', async () => {
      const notFoundError = {
        response: { status: 404, data: { message: 'PTW not found' } },
      };
      (axiosInstance.get as jest.Mock).mockRejectedValue(notFoundError);

      await expect(ptwService.getPtwById('nonexistent')).rejects.toEqual(notFoundError);
    });

    it('should handle API errors when fetching by ID', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(ptwService.getPtwById('ptw-1')).rejects.toThrow('Network Error');
    });
  });

  describe('submitPtw', () => {
    it('should submit PTW for approval', async () => {
      const mockResponse = { approvalStatus: 'SUBMITTED' };
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await ptwService.submitPtw('ptw-1');

      expect(axiosInstance.patch).toHaveBeenCalledWith('/ptw/ptw-1/submit');
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors when submitting', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { message: 'PTW must be linked to an approved JSA' },
        },
      };
      (axiosInstance.patch as jest.Mock).mockRejectedValue(validationError);

      await expect(ptwService.submitPtw('ptw-1')).rejects.toEqual(validationError);
    });

    it('should handle forbidden errors when non-creator tries to submit', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Only the creator can submit this PTW' },
        },
      };
      (axiosInstance.patch as jest.Mock).mockRejectedValue(forbiddenError);

      await expect(ptwService.submitPtw('ptw-1')).rejects.toEqual(forbiddenError);
    });

    it('should handle API errors when submitting', async () => {
      const error = new Error('Network Error');
      (axiosInstance.patch as jest.Mock).mockRejectedValue(error);

      await expect(ptwService.submitPtw('ptw-1')).rejects.toThrow('Network Error');
    });
  });
});