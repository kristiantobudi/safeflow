import axiosInstance from '../axios';
import { jsaService, CreateJsaData, JsaDetail, JsaListItem } from './jsa';

// Mock axios instance
jest.mock('../axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('jsaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createJsa', () => {
    const mockJsaDetail: JsaDetail = {
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
      versions: [],
    };

    it('should create a new JSA with valid data', async () => {
      const createData: CreateJsaData = {
        jenisKegiatan: 'Pekerjaan Las',
        lokasiKegiatan: 'Area A',
        apd: {
          safetyHelmet: true,
          safetyShoes: true,
        },
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockJsaDetail });

      const result = await jsaService.createJsa(createData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/jsa', createData);
      expect(result).toEqual(mockJsaDetail);
    });

    it('should create JSA with minimal data', async () => {
      const minimalData: CreateJsaData = {
        jenisKegiatan: 'Inspeksi',
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockJsaDetail });

      const result = await jsaService.createJsa(minimalData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/jsa', minimalData);
      expect(result).toEqual(mockJsaDetail);
    });

    it('should handle API errors when creating JSA', async () => {
      const error = new Error('Network Error');
      (axiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(jsaService.createJsa({ jenisKegiatan: 'Test' })).rejects.toThrow('Network Error');
    });

    it('should include all optional fields when provided', async () => {
      const fullData: CreateJsaData = {
        jenisKegiatan: 'Pekerjaan Las',
        lokasiKegiatan: 'Area A',
        tanggalDibuat: '2024-01-15',
        referensiHirarc: 'HIRAC-001',
        hiracId: 'hirac-1',
        pelaksanaUtama: 'John Doe',
        hseInCharge: 'Jane Smith',
        apd: {
          safetyHelmet: true,
          safetyShoes: true,
          gloves: true,
          safetyGlasses: false,
          safetyVest: true,
          safetyBodyHarness: false,
          others: 'APD Tambahan',
        },
      };

      (axiosInstance.post as jest.Mock).mockResolvedValue({ data: mockJsaDetail });

      await jsaService.createJsa(fullData);

      expect(axiosInstance.post).toHaveBeenCalledWith('/jsa', fullData);
    });
  });

  describe('getJsaList', () => {
    const mockJsaList: JsaListItem[] = [
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
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        versions: [],
      },
    ];

    it('should fetch all JSA records', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockJsaList });

      const result = await jsaService.getJsaList();

      expect(axiosInstance.get).toHaveBeenCalledWith('/jsa');
      expect(result).toEqual(mockJsaList);
    });

    it('should return empty array when no JSA records exist', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: [] });

      const result = await jsaService.getJsaList();

      expect(result).toEqual([]);
    });

    it('should handle API errors when fetching list', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(jsaService.getJsaList()).rejects.toThrow('Network Error');
    });
  });

  describe('getJsaById', () => {
    const mockJsaDetail: JsaDetail = {
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
      versions: [],
    };

    it('should fetch JSA by ID', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValue({ data: mockJsaDetail });

      const result = await jsaService.getJsaById('jsa-1');

      expect(axiosInstance.get).toHaveBeenCalledWith('/jsa/jsa-1');
      expect(result).toEqual(mockJsaDetail);
    });

    it('should handle 404 error when JSA not found', async () => {
      const notFoundError = {
        response: { status: 404, data: { message: 'JSA not found' } },
      };
      (axiosInstance.get as jest.Mock).mockRejectedValue(notFoundError);

      await expect(jsaService.getJsaById('nonexistent')).rejects.toEqual(notFoundError);
    });

    it('should handle API errors when fetching by ID', async () => {
      const error = new Error('Network Error');
      (axiosInstance.get as jest.Mock).mockRejectedValue(error);

      await expect(jsaService.getJsaById('jsa-1')).rejects.toThrow('Network Error');
    });
  });

  describe('submitJsa', () => {
    it('should submit JSA for approval', async () => {
      const mockResponse = { approvalStatus: 'SUBMITTED' };
      (axiosInstance.patch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await jsaService.submitJsa('jsa-1');

      expect(axiosInstance.patch).toHaveBeenCalledWith('/jsa/jsa-1/submit');
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors when submitting', async () => {
      const validationError = {
        response: {
          status: 400,
          data: { message: 'JSA must be linked to a HIRAC' },
        },
      };
      (axiosInstance.patch as jest.Mock).mockRejectedValue(validationError);

      await expect(jsaService.submitJsa('jsa-1')).rejects.toEqual(validationError);
    });

    it('should handle forbidden errors when non-creator tries to submit', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: { message: 'Only the creator can submit this JSA' },
        },
      };
      (axiosInstance.patch as jest.Mock).mockRejectedValue(forbiddenError);

      await expect(jsaService.submitJsa('jsa-1')).rejects.toEqual(forbiddenError);
    });

    it('should handle API errors when submitting', async () => {
      const error = new Error('Network Error');
      (axiosInstance.patch as jest.Mock).mockRejectedValue(error);

      await expect(jsaService.submitJsa('jsa-1')).rejects.toThrow('Network Error');
    });
  });
});