/**
 * Form Validation Integration Tests
 *
 * These tests simulate complete form submission scenarios as they would occur
 * in the application — full valid submissions, partial submissions, and
 * realistic invalid inputs that users might enter.
 */

import { createJsaSchema } from './jsa.schema';
import { createPtwSchema } from './ptw.schema';
import { createModuleSchema } from './module.schema';
import { createExamSchema } from './exam.schema';
import { createQuestionSchema } from './question.schema';

// ─── JSA Form Integration ─────────────────────────────────────────────────────

describe('JSA form submission scenarios', () => {
  describe('complete form submission', () => {
    it('should accept a fully filled JSA form', async () => {
      const fullFormData = {
        jenisKegiatan: 'Pekerjaan Pengelasan di Ketinggian',
        lokasiKegiatan: 'Lantai 3 Gedung Produksi',
        tanggalDibuat: new Date('2024-06-01'),
        referensiHirarc: 'HIRAC-2024-001',
        pelaksanaUtama: 'PT Maju Bersama',
        hseInCharge: 'Budi Santoso',
        apd: {
          safetyHelmet: true,
          safetyShoes: true,
          gloves: true,
          safetyGlasses: true,
          safetyVest: true,
          safetyBodyHarness: true,
          lainnya: 'Full body suit',
        },
      };

      const result = await createJsaSchema.validate(fullFormData);
      expect(result.jenisKegiatan).toBe('Pekerjaan Pengelasan di Ketinggian');
      expect(result.apd?.safetyHelmet).toBe(true);
      expect(result.apd?.safetyBodyHarness).toBe(true);
    });

    it('should accept a minimal JSA form (only required fields)', async () => {
      const minimalFormData = {
        jenisKegiatan: 'Inspeksi Rutin',
      };

      const result = await createJsaSchema.validate(minimalFormData);
      expect(result.jenisKegiatan).toBe('Inspeksi Rutin');
    });

    it('should trim whitespace from all string fields on submission', async () => {
      const formDataWithWhitespace = {
        jenisKegiatan: '  Pekerjaan Pemeliharaan  ',
        lokasiKegiatan: '  Area Produksi  ',
        pelaksanaUtama: '  PT Contoh  ',
        hseInCharge: '  John Doe  ',
        referensiHirarc: '  REF-001  ',
      };

      const result = await createJsaSchema.validate(formDataWithWhitespace);
      expect(result.jenisKegiatan).toBe('Pekerjaan Pemeliharaan');
      expect(result.lokasiKegiatan).toBe('Area Produksi');
      expect(result.pelaksanaUtama).toBe('PT Contoh');
      expect(result.hseInCharge).toBe('John Doe');
      expect(result.referensiHirarc).toBe('REF-001');
    });
  });

  describe('partial form submission (optional fields omitted)', () => {
    it('should accept form with only jenisKegiatan and APD', async () => {
      const partialData = {
        jenisKegiatan: 'Pekerjaan Listrik',
        apd: {
          safetyHelmet: true,
          safetyGlasses: true,
        },
      };

      const result = await createJsaSchema.validate(partialData);
      expect(result.jenisKegiatan).toBe('Pekerjaan Listrik');
      expect(result.apd?.safetyHelmet).toBe(true);
      // Unset APD fields should default to false
      expect(result.apd?.safetyShoes).toBe(false);
    });

    it('should accept form with jenisKegiatan and date only', async () => {
      const partialData = {
        jenisKegiatan: 'Audit Keselamatan',
        tanggalDibuat: new Date('2024-03-15'),
      };

      await expect(createJsaSchema.validate(partialData)).resolves.toBeDefined();
    });
  });

  describe('invalid form submissions', () => {
    it('should reject empty form submission', async () => {
      await expect(createJsaSchema.validate({})).rejects.toThrow('Jenis kegiatan wajib diisi');
    });

    it('should reject form where jenisKegiatan is only spaces (user accidentally submits whitespace)', async () => {
      const formData = {
        jenisKegiatan: '     ',
        lokasiKegiatan: 'Area A',
      };

      await expect(createJsaSchema.validate(formData)).rejects.toThrow('Jenis kegiatan wajib diisi');
    });

    it('should reject form where jenisKegiatan is too short (user types 2 chars)', async () => {
      const formData = {
        jenisKegiatan: 'AB',
      };

      await expect(createJsaSchema.validate(formData)).rejects.toThrow('Jenis kegiatan minimal 3 karakter');
    });
  });
});

// ─── PTW Form Integration ─────────────────────────────────────────────────────

describe('PTW form submission scenarios', () => {
  const validJsaId = '550e8400-e29b-41d4-a716-446655440000';

  describe('complete form submission', () => {
    it('should accept a fully filled PTW form', async () => {
      const fullFormData = {
        judulPekerjaan: 'Pekerjaan Pengelasan Pipa Gas',
        jsaProjectId: validJsaId,
        lokasiPekerjaan: 'Ruang Mesin Lantai 2',
        tanggalMulai: new Date('2024-07-01'),
        tanggalSelesai: new Date('2024-07-05'),
        keteranganTambahan: 'Pekerjaan dilakukan oleh teknisi bersertifikat. Pastikan area bebas dari bahan mudah terbakar.',
      };

      const result = await createPtwSchema.validate(fullFormData);
      expect(result.judulPekerjaan).toBe('Pekerjaan Pengelasan Pipa Gas');
      expect(result.jsaProjectId).toBe(validJsaId);
    });

    it('should accept a minimal PTW form (only required fields)', async () => {
      const minimalFormData = {
        judulPekerjaan: 'Pekerjaan Inspeksi',
        jsaProjectId: validJsaId,
      };

      const result = await createPtwSchema.validate(minimalFormData);
      expect(result.judulPekerjaan).toBe('Pekerjaan Inspeksi');
      expect(result.jsaProjectId).toBe(validJsaId);
    });

    it('should trim whitespace from string fields on submission', async () => {
      const formDataWithWhitespace = {
        judulPekerjaan: '  Pekerjaan Pemeliharaan  ',
        jsaProjectId: validJsaId,
        lokasiPekerjaan: '  Area B  ',
        keteranganTambahan: '  Catatan penting  ',
      };

      const result = await createPtwSchema.validate(formDataWithWhitespace);
      expect(result.judulPekerjaan).toBe('Pekerjaan Pemeliharaan');
      expect(result.lokasiPekerjaan).toBe('Area B');
      expect(result.keteranganTambahan).toBe('Catatan penting');
    });
  });

  describe('cross-field date validation', () => {
    it('should reject form where end date is before start date', async () => {
      const formData = {
        judulPekerjaan: 'Pekerjaan Konstruksi',
        jsaProjectId: validJsaId,
        tanggalMulai: new Date('2024-07-10'),
        tanggalSelesai: new Date('2024-07-05'),
      };

      await expect(createPtwSchema.validate(formData)).rejects.toThrow(
        'Tanggal selesai harus setelah tanggal mulai',
      );
    });

    it('should accept form where end date equals start date', async () => {
      const sameDay = new Date('2024-07-01');
      const formData = {
        judulPekerjaan: 'Pekerjaan Satu Hari',
        jsaProjectId: validJsaId,
        tanggalMulai: sameDay,
        tanggalSelesai: sameDay,
      };

      await expect(createPtwSchema.validate(formData)).resolves.toBeDefined();
    });

    it('should accept form with only start date (end date not yet set)', async () => {
      const formData = {
        judulPekerjaan: 'Pekerjaan Ongoing',
        jsaProjectId: validJsaId,
        tanggalMulai: new Date('2024-07-01'),
      };

      await expect(createPtwSchema.validate(formData)).resolves.toBeDefined();
    });
  });

  describe('invalid form submissions', () => {
    it('should reject empty form submission with a validation error', async () => {
      await expect(createPtwSchema.validate({})).rejects.toThrow();
    });

    it('should reject form with missing jsaProjectId', async () => {
      const formData = { judulPekerjaan: 'Pekerjaan Valid' };
      await expect(createPtwSchema.validate(formData)).rejects.toThrow('JSA terkait wajib dipilih');
    });

    it('should reject form with invalid UUID for jsaProjectId', async () => {
      const formData = {
        judulPekerjaan: 'Pekerjaan Valid',
        jsaProjectId: 'bukan-uuid-valid',
      };
      await expect(createPtwSchema.validate(formData)).rejects.toThrow('ID JSA tidak valid');
    });

    it('should reject keteranganTambahan exceeding 1000 characters', async () => {
      const formData = {
        judulPekerjaan: 'Pekerjaan Valid',
        jsaProjectId: validJsaId,
        keteranganTambahan: 'A'.repeat(1001),
      };
      await expect(createPtwSchema.validate(formData)).rejects.toThrow('Keterangan maksimal 1000 karakter');
    });

    it('should reject judulPekerjaan exceeding 255 characters', async () => {
      const formData = {
        judulPekerjaan: 'A'.repeat(256),
        jsaProjectId: validJsaId,
      };
      await expect(createPtwSchema.validate(formData)).rejects.toThrow('Judul pekerjaan maksimal 255 karakter');
    });
  });
});

// ─── Training Module Form Integration ────────────────────────────────────────

describe('Training module form submission scenarios', () => {
  describe('complete form submission', () => {
    it('should accept a fully filled module form', async () => {
      const fullFormData = {
        title: 'Keselamatan Kerja di Ketinggian',
        description: 'Modul pelatihan lengkap untuk pekerjaan di ketinggian, mencakup penggunaan APD dan prosedur darurat.',
      };

      const result = await createModuleSchema.validate(fullFormData);
      expect(result.title).toBe('Keselamatan Kerja di Ketinggian');
      expect(result.description).toBe(fullFormData.description);
    });

    it('should accept a minimal module form (title only)', async () => {
      const minimalFormData = { title: 'K3 Dasar' };

      const result = await createModuleSchema.validate(minimalFormData);
      expect(result.title).toBe('K3 Dasar');
    });

    it('should accept module form with empty description', async () => {
      const formData = { title: 'Modul Pelatihan', description: '' };

      await expect(createModuleSchema.validate(formData)).resolves.toBeDefined();
    });
  });

  describe('invalid form submissions', () => {
    it('should reject empty form submission', async () => {
      await expect(createModuleSchema.validate({})).rejects.toThrow('Judul modul wajib diisi');
    });

    it('should reject title shorter than 3 characters', async () => {
      await expect(createModuleSchema.validate({ title: 'AB' })).rejects.toThrow('Judul modul minimal 3 karakter');
    });

    it('should reject title longer than 100 characters', async () => {
      await expect(createModuleSchema.validate({ title: 'A'.repeat(101) })).rejects.toThrow('Judul modul maksimal 100 karakter');
    });

    it('should reject title that is only whitespace', async () => {
      await expect(createModuleSchema.validate({ title: '   ' })).rejects.toThrow('Judul modul wajib diisi');
    });
  });
});

// ─── Exam Form Integration ────────────────────────────────────────────────────

describe('Exam form submission scenarios', () => {
  const validModuleId = '550e8400-e29b-41d4-a716-446655440001';

  describe('complete form submission', () => {
    it('should accept a fully filled exam form', async () => {
      const fullFormData = {
        moduleId: validModuleId,
        duration: 90,
        maxAttempts: 3,
      };

      const result = await createExamSchema.validate(fullFormData);
      expect(result.moduleId).toBe(validModuleId);
      expect(result.duration).toBe(90);
      expect(result.maxAttempts).toBe(3);
    });

    it('should accept exam form with only required fields', async () => {
      const minimalFormData = {
        moduleId: validModuleId,
        duration: 60,
      };

      const result = await createExamSchema.validate(minimalFormData);
      expect(result.duration).toBe(60);
    });
  });

  describe('invalid form submissions', () => {
    it('should reject form with missing moduleId', async () => {
      await expect(createExamSchema.validate({ duration: 60 })).rejects.toThrow('moduleId is required');
    });

    it('should reject form with invalid UUID for moduleId', async () => {
      await expect(
        createExamSchema.validate({ moduleId: 'not-a-uuid', duration: 60 }),
      ).rejects.toThrow('moduleId must be a valid UUID');
    });

    it('should reject form with zero duration', async () => {
      await expect(
        createExamSchema.validate({ moduleId: validModuleId, duration: 0 }),
      ).rejects.toThrow('Duration must be at least 1 minute');
    });

    it('should reject form with negative duration', async () => {
      await expect(
        createExamSchema.validate({ moduleId: validModuleId, duration: -30 }),
      ).rejects.toThrow('Duration must be at least 1 minute');
    });

    it('should reject form with zero maxAttempts', async () => {
      await expect(
        createExamSchema.validate({ moduleId: validModuleId, duration: 60, maxAttempts: 0 }),
      ).rejects.toThrow('maxAttempts must be at least 1');
    });
  });
});

// ─── Question Form Integration ────────────────────────────────────────────────

describe('Question form submission scenarios', () => {
  const validExamId = '550e8400-e29b-41d4-a716-446655440002';

  describe('complete form submission', () => {
    it('should accept a fully filled question form with 4 options', async () => {
      const fullFormData = {
        examId: validExamId,
        question: 'Apa yang harus dilakukan sebelum memulai pekerjaan di ketinggian?',
        options: [
          'Memakai safety harness',
          'Langsung mulai bekerja',
          'Minum kopi terlebih dahulu',
          'Menunggu instruksi atasan',
        ],
        correctAnswer: 'Memakai safety harness',
      };

      const result = await createQuestionSchema.validate(fullFormData);
      expect(result.question).toBe(fullFormData.question);
      expect(result.correctAnswer).toBe('Memakai safety harness');
    });

    it('should accept a question form with exactly 2 options (minimum)', async () => {
      const formData = {
        examId: validExamId,
        question: 'Apakah safety helmet wajib dipakai?',
        options: ['Ya, selalu wajib', 'Tidak, opsional'],
        correctAnswer: 'Ya, selalu wajib',
      };

      await expect(createQuestionSchema.validate(formData)).resolves.toBeDefined();
    });

    it('should accept a question with correctAnswer as the last option', async () => {
      const formData = {
        examId: validExamId,
        question: 'Berapa batas maksimum beban angkat manual?',
        options: ['10 kg', '20 kg', '30 kg', '40 kg'],
        correctAnswer: '40 kg',
      };

      await expect(createQuestionSchema.validate(formData)).resolves.toBeDefined();
    });
  });

  describe('invalid form submissions', () => {
    it('should reject form with missing question text', async () => {
      const formData = {
        examId: validExamId,
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Question is required');
    });

    it('should reject form where question is too short (less than 10 chars)', async () => {
      const formData = {
        examId: validExamId,
        question: 'Short?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'Option A',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Question must be at least 10 characters');
    });

    it('should reject form where correctAnswer is not in options list', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: ['Option A', 'Option B', 'Option C'],
        correctAnswer: 'Option D',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Correct answer must be one of the options');
    });

    it('should reject form where correctAnswer has wrong case (case-sensitive)', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: ['Option A', 'Option B'],
        correctAnswer: 'option a',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Correct answer must be one of the options');
    });

    it('should reject form with only one option', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: ['Only Option'],
        correctAnswer: 'Only Option',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow();
    });

    it('should reject form with empty options array', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: [],
        correctAnswer: 'Something',
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow();
    });
  });

  describe('realistic user error scenarios', () => {
    it('should reject when user forgets to select a correct answer', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: ['Option A', 'Option B'],
        // correctAnswer omitted
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Correct answer is required');
    });

    it('should reject when user types correct answer differently from option text', async () => {
      const formData = {
        examId: validExamId,
        question: 'Pertanyaan yang cukup panjang untuk valid?',
        options: ['Memakai APD lengkap', 'Tidak perlu APD'],
        correctAnswer: 'Memakai APD Lengkap', // capital L — mismatch
      };

      await expect(createQuestionSchema.validate(formData)).rejects.toThrow('Correct answer must be one of the options');
    });
  });
});
