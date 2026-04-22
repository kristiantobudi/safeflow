import { createModuleSchema } from './module.schema';
import { createExamSchema } from './exam.schema';
import { createJsaSchema } from './jsa.schema';
import { createPtwSchema } from './ptw.schema';

describe('createModuleSchema', () => {
  const validModuleData = {
    title: 'Safety Training Module',
    description: 'A comprehensive safety training module',
  };

  describe('valid inputs', () => {
    it('should validate correct input with all required fields', async () => {
      await expect(createModuleSchema.validate(validModuleData)).resolves.toBeDefined();
    });

    it('should validate with only required title field', async () => {
      const data = { title: 'Module Title' };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate title with exactly 3 characters', async () => {
      const data = { title: 'ABC' };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate title with exactly 100 characters', async () => {
      const data = { title: 'A'.repeat(100) };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with empty description (undefined)', async () => {
      const data = { title: 'Module Title', description: undefined };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with empty description (empty string)', async () => {
      const data = { title: 'Module Title', description: '' };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should trim whitespace from title', async () => {
      const data = { title: '  Module Title  ' };
      const result = await createModuleSchema.validate(data);
      expect(result.title).toBe('Module Title');
    });

    it('should trim whitespace from description', async () => {
      const data = { title: 'Module Title', description: '  Description  ' };
      const result = await createModuleSchema.validate(data);
      expect(result.description).toBe('Description');
    });
  });

  describe('title validation', () => {
    it('should fail when title is missing', async () => {
      const data = { description: 'Some description' };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul wajib diisi');
    });

    it('should fail when title is an empty string', async () => {
      const data = { title: '' };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul wajib diisi');
    });

    it('should fail when title has less than 3 characters', async () => {
      const data = { title: 'AB' };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul minimal 3 karakter');
    });

    it('should fail when title has exactly 2 characters', async () => {
      const data = { title: 'AB' };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul minimal 3 karakter');
    });

    it('should fail when title has more than 100 characters', async () => {
      const data = { title: 'A'.repeat(101) };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul maksimal 100 karakter');
    });

    it('should fail when title has exactly 101 characters', async () => {
      const data = { title: 'A'.repeat(101) };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul maksimal 100 karakter');
    });

    it('should fail when title is only whitespace', async () => {
      const data = { title: '   ' };
      await expect(createModuleSchema.validate(data)).rejects.toThrow('Judul modul wajib diisi');
    });
  });

  describe('description validation', () => {
    it('should accept valid description', async () => {
      const data = { title: 'Module', description: 'Valid description' };
      await expect(createModuleSchema.validate(data)).resolves.toBeDefined();
    });

    it('should trim description whitespace', async () => {
      const data = { title: 'Module', description: '  trimmed  ' };
      const result = await createModuleSchema.validate(data);
      expect(result.description).toBe('trimmed');
    });
  });
});

describe('createExamSchema', () => {
  const validExamData = {
    moduleId: '550e8400-e29b-41d4-a716-446655440000',
    duration: 60,
    maxAttempts: 3,
  };

  describe('valid inputs', () => {
    it('should validate correct input with all required fields', async () => {
      await expect(createExamSchema.validate(validExamData)).resolves.toBeDefined();
    });

    it('should validate with only required fields', async () => {
      const data = {
        moduleId: '550e8400-e29b-41d4-a716-446655440000',
        duration: 30,
      };
      await expect(createExamSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with duration of 1 minute', async () => {
      const data = { ...validExamData, duration: 1 };
      await expect(createExamSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with maxAttempts of 1', async () => {
      const data = { ...validExamData, maxAttempts: 1 };
      await expect(createExamSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with large duration value', async () => {
      const data = { ...validExamData, duration: 1000 };
      await expect(createExamSchema.validate(data)).resolves.toBeDefined();
    });
  });

  describe('moduleId validation', () => {
    it('should fail when moduleId is missing', async () => {
      const data = { duration: 60 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('moduleId is required');
    });

    it('should fail when moduleId is not a valid UUID', async () => {
      const data = { ...validExamData, moduleId: 'not-a-valid-uuid' };
      await expect(createExamSchema.validate(data)).rejects.toThrow('moduleId must be a valid UUID');
    });

    it('should fail when moduleId is an empty string', async () => {
      const data = { ...validExamData, moduleId: '' };
      await expect(createExamSchema.validate(data)).rejects.toThrow('moduleId must be a valid UUID');
    });

    it('should fail when moduleId is a partial UUID', async () => {
      const data = { ...validExamData, moduleId: '550e8400-e29b-41d4-a716' };
      await expect(createExamSchema.validate(data)).rejects.toThrow('moduleId must be a valid UUID');
    });
  });

  describe('duration validation', () => {
    it('should fail when duration is missing', async () => {
      const data = { moduleId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createExamSchema.validate(data)).rejects.toThrow('duration is required');
    });

    it('should fail when duration is 0', async () => {
      const data = { ...validExamData, duration: 0 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('Duration must be at least 1 minute');
    });

    it('should fail when duration is negative', async () => {
      const data = { ...validExamData, duration: -10 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('Duration must be at least 1 minute');
    });

    it('should fail when duration is a decimal less than 1', async () => {
      const data = { ...validExamData, duration: 0.5 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('Duration must be at least 1 minute');
    });
  });

  describe('maxAttempts validation', () => {
    it('should accept valid maxAttempts', async () => {
      const data = { ...validExamData, maxAttempts: 5 };
      await expect(createExamSchema.validate(data)).resolves.toBeDefined();
    });

    it('should fail when maxAttempts is 0', async () => {
      const data = { ...validExamData, maxAttempts: 0 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('maxAttempts must be at least 1');
    });

    it('should fail when maxAttempts is negative', async () => {
      const data = { ...validExamData, maxAttempts: -1 };
      await expect(createExamSchema.validate(data)).rejects.toThrow('maxAttempts must be at least 1');
    });
  });
});

describe('createJsaSchema', () => {
  const validJsaData = {
    jenisKegiatan: 'Pekerjaan Pemeliharaan Mesin',
    lokasiKegiatan: 'Area Produksi',
    tanggalDibuat: new Date('2024-01-15'),
    referensiHirarc: 'HIRAC-2024-001',
    pelaksanaUtama: 'PT Maju Bersama',
    hseInCharge: 'John Doe',
    apd: {
      safetyHelmet: true,
      safetyShoes: true,
      gloves: true,
      safetyGlasses: false,
      safetyVest: true,
      safetyBodyHarness: false,
      lainnya: 'Sepatu boot',
    },
  };

  describe('valid inputs', () => {
    it('should validate correct input with all required fields', async () => {
      await expect(createJsaSchema.validate(validJsaData)).resolves.toBeDefined();
    });

    it('should validate with only required jenisKegiatan field', async () => {
      const data = { jenisKegiatan: 'Pekerjaan Baru' };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with optional fields as empty strings', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan Baru',
        lokasiKegiatan: '',
        referensiHirarc: '',
        pelaksanaUtama: '',
        hseInCharge: '',
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with empty optional strings', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan Baru',
        lokasiKegiatan: '',
        referensiHirarc: '',
        pelaksanaUtama: '',
        hseInCharge: '',
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with all apd fields false', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan Baru',
        apd: {
          safetyHelmet: false,
          safetyShoes: false,
          gloves: false,
          safetyGlasses: false,
          safetyVest: false,
          safetyBodyHarness: false,
          lainnya: '',
        },
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate without apd field', async () => {
      const data = { jenisKegiatan: 'Pekerjaan Baru' };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with partial apd fields', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan Baru',
        apd: {
          safetyHelmet: true,
        },
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate jenisKegiatan with exactly 3 characters', async () => {
      const data = { jenisKegiatan: 'ABC' };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should trim whitespace from string fields', async () => {
      const data = {
        jenisKegiatan: '  Pekerjaan  ',
        lokasiKegiatan: '  Area  ',
        pelaksanaUtama:  '  Name  ',
        hseInCharge: '  HSE  ',
        referensiHirarc: '  REF  ',
      };
      const result = await createJsaSchema.validate(data);
      expect(result.jenisKegiatan).toBe('Pekerjaan');
      expect(result.lokasiKegiatan).toBe('Area');
      expect(result.pelaksanaUtama).toBe('Name');
      expect(result.hseInCharge).toBe('HSE');
      expect(result.referensiHirarc).toBe('REF');
    });

    it('should trim whitespace from apd.lainnya', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        apd: { lainnya: '  Additional PPE  ' },
      };
      const result = await createJsaSchema.validate(data);
      expect(result.apd?.lainnya).toBe('Additional PPE');
    });
  });

  describe('jenisKegiatan validation', () => {
    it('should fail when jenisKegiatan is missing', async () => {
      const data = { lokasiKegiatan: 'Area' };
      await expect(createJsaSchema.validate(data)).rejects.toThrow('Jenis kegiatan wajib diisi');
    });

    it('should fail when jenisKegiatan is an empty string', async () => {
      const data = { jenisKegiatan: '' };
      await expect(createJsaSchema.validate(data)).rejects.toThrow('Jenis kegiatan wajib diisi');
    });

    it('should fail when jenisKegiatan has less than 3 characters', async () => {
      const data = { jenisKegiatan: 'AB' };
      await expect(createJsaSchema.validate(data)).rejects.toThrow('Jenis kegiatan minimal 3 karakter');
    });

    it('should fail when jenisKegiatan is only whitespace', async () => {
      const data = { jenisKegiatan: '   ' };
      await expect(createJsaSchema.validate(data)).rejects.toThrow('Jenis kegiatan wajib diisi');
    });
  });

  describe('optional field validation', () => {
    it('should accept valid optional date', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        tanggalDibuat: new Date('2024-01-15'),
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should accept valid optional string fields', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        lokasiKegiatan: 'Some Location',
        referensiHirarc: 'REF-001',
        pelaksanaUtama: 'Company',
        hseInCharge: 'Person',
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });
  });

  describe('apd validation', () => {
    it('should validate apd object with all boolean fields', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        apd: {
          safetyHelmet: true,
          safetyShoes: false,
          gloves: true,
          safetyGlasses: false,
          safetyVest: true,
          safetyBodyHarness: false,
          lainnya: 'Some equipment',
        },
      };
      await expect(createJsaSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate apd with default boolean values', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        apd: {},
      };
      const result = await createJsaSchema.validate(data);
      expect(result.apd?.safetyHelmet).toBe(false);
      expect(result.apd?.safetyShoes).toBe(false);
      expect(result.apd?.gloves).toBe(false);
      expect(result.apd?.safetyGlasses).toBe(false);
      expect(result.apd?.safetyVest).toBe(false);
      expect(result.apd?.safetyBodyHarness).toBe(false);
    });

    it('should trim apd.lainnya whitespace', async () => {
      const data = {
        jenisKegiatan: 'Pekerjaan',
        apd: { lainnya: '  Equipment  ' },
      };
      const result = await createJsaSchema.validate(data);
      expect(result.apd?.lainnya).toBe('Equipment');
    });
  });
});

describe('createPtwSchema', () => {
  const validPtwData = {
    judulPekerjaan: 'Pekerjaan Pemeliharaan Berkala',
    jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
    lokasiPekerjaan: 'Area Produksi',
    tanggalMulai: new Date('2024-01-15'),
    tanggalSelesai: new Date('2024-01-20'),
    keteranganTambahan: 'Pekerjaan dilakukan pada jam operasional normal',
  };

  describe('valid inputs', () => {
    it('should validate correct input with all required fields', async () => {
      await expect(createPtwSchema.validate(validPtwData)).resolves.toBeDefined();
    });

    it('should validate with only required fields', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan Baru',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with empty optional strings', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan Baru',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        lokasiPekerjaan: '',
        keteranganTambahan: '',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with null/undefined optional dates', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan Baru',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: null,
        tanggalSelesai: undefined,
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with same tanggalMulai and tanggalSelesai', async () => {
      const date = new Date('2024-01-15');
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: date,
        tanggalSelesai: date,
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with tanggalSelesai after tanggalMulai', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: new Date('2024-01-15'),
        tanggalSelesai: new Date('2024-01-20'),
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with long keteranganTambahan (1000 chars)', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        keteranganTambahan: 'A'.repeat(1000),
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with exactly 3 character judulPekerjaan', async () => {
      const data = {
        judulPekerjaan: 'ABC',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should validate with exactly 255 character judulPekerjaan', async () => {
      const data = {
        judulPekerjaan: 'A'.repeat(255),
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should trim whitespace from string fields', async () => {
      const data = {
        judulPekerjaan: '  Judul  ',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        lokasiPekerjaan: '  Lokasi  ',
        keteranganTambahan:  '  Keterangan  ',
      };
      const result = await createPtwSchema.validate(data);
      expect(result.judulPekerjaan).toBe('Judul');
      expect(result.lokasiPekerjaan).toBe('Lokasi');
      expect(result.keteranganTambahan).toBe('Keterangan');
    });
  });

  describe('judulPekerjaan validation', () => {
    it('should fail when judulPekerjaan is missing', async () => {
      const data = { jsaProjectId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Judul pekerjaan wajib diisi');
    });

    it('should fail when judulPekerjaan is an empty string', async () => {
      const data = { judulPekerjaan: '', jsaProjectId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Judul pekerjaan wajib diisi');
    });

    it('should fail when judulPekerjaan has less than 3 characters', async () => {
      const data = { judulPekerjaan: 'AB', jsaProjectId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Judul pekerjaan minimal 3 karakter');
    });

    it('should fail when judulPekerjaan has more than 255 characters', async () => {
      const data = { judulPekerjaan: 'A'.repeat(256), jsaProjectId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Judul pekerjaan maksimal 255 karakter');
    });

    it('should fail when judulPekerjaan is only whitespace', async () => {
      const data = { judulPekerjaan: '   ', jsaProjectId: '550e8400-e29b-41d4-a716-446655440000' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Judul pekerjaan wajib diisi');
    });
  });

  describe('jsaProjectId validation', () => {
    it('should fail when jsaProjectId is missing', async () => {
      const data = { judulPekerjaan: 'Pekerjaan' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('JSA terkait wajib dipilih');
    });

    it('should fail when jsaProjectId is not a valid UUID', async () => {
      const data = { judulPekerjaan: 'Pekerjaan', jsaProjectId: 'not-a-valid-uuid' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('ID JSA tidak valid');
    });

    it('should fail when jsaProjectId is an empty string', async () => {
      const data = { judulPekerjaan: 'Pekerjaan', jsaProjectId: '' };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('JSA terkait wajib dipilih');
    });
  });

  describe('cross-field validation (tanggalSelesai > tanggalMulai)', () => {
    it('should fail when tanggalSelesai is before tanggalMulai', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: new Date('2024-01-20'),
        tanggalSelesai: new Date('2024-01-15'),
      };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Tanggal selesai harus setelah tanggal mulai');
    });

    it('should fail when tanggalSelesai is one day before tanggalMulai', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: new Date('2024-01-16'),
        tanggalSelesai: new Date('2024-01-15'),
      };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Tanggal selesai harus setelah tanggal mulai');
    });

    it('should pass when tanggalMulai is null and tanggalSelesai is set', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: null,
        tanggalSelesai: new Date('2024-01-20'),
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should pass when tanggalSelesai is null and tanggalMulai is set', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: new Date('2024-01-15'),
        tanggalSelesai: null,
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should pass when both dates are undefined', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: undefined,
        tanggalSelesai: undefined,
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });
  });

  describe('keteranganTambahan validation', () => {
    it('should fail when keteranganTambah has more than 1000 characters', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        keteranganTambahan: 'A'.repeat(1001),
      };
      await expect(createPtwSchema.validate(data)).rejects.toThrow('Keterangan maksimal 1000 karakter');
    });

    it('should accept valid keteranganTambah', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        keteranganTambahan: 'Valid description',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });
  });

  describe('optional field validation', () => {
    it('should accept valid optional lokasiPekerjaan', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        lokasiPekerjaan: 'Some Location',
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });

    it('should accept valid optional dates', async () => {
      const data = {
        judulPekerjaan: 'Pekerjaan',
        jsaProjectId: '550e8400-e29b-41d4-a716-446655440000',
        tanggalMulai: new Date('2024-01-15'),
        tanggalSelesai: new Date('2024-01-20'),
      };
      await expect(createPtwSchema.validate(data)).resolves.toBeDefined();
    });
  });
});