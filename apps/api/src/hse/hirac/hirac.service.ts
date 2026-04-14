import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateHiracDto } from './dto/create-hirac.dto';
import {
  ProjectStatus,
  ActivityCategory,
  RiskLevel,
  StatusControl,
} from '@repo/database';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

@Injectable()
export class HiracService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Validasi project boleh diedit ──────────────────────────────────────────
  private async validateProjectEditable(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const editableStatuses: ProjectStatus[] = [
      ProjectStatus.DRAFT,
      ProjectStatus.REVISION,
    ];

    if (!editableStatuses.includes(project.status)) {
      throw new BadRequestException(
        `Cannot modify HIRAC: project is currently in "${project.status}" status`,
      );
    }
  }

  // ─── Tambah HIRAC baru ke project ───────────────────────────────────────────
  async addHiracToProject(
    projectId: string,
    data: CreateHiracDto,
    userId: string,
  ) {
    await this.validateProjectEditable(projectId);

    const { penilaianAwal, penilaianLanjutan, ...rest } = data;

    const hirac = await this.prisma.hirac.create({
      data: {
        ...rest,
        no: data.no as any,
        penilaianAwalAkibat: penilaianAwal.akibat,
        penilaianAwalKemungkinan: penilaianAwal.kemungkinan,
        penilaianAwalTingkatRisiko: penilaianAwal.tingkatRisiko,
        penilaianLanjutanAkibat: penilaianLanjutan.akibat,
        penilaianLanjutanKemungkinan: penilaianLanjutan.kemungkinan,
        penilaianLanjutanTingkatRisiko: penilaianLanjutan.tingkatRisiko,
        projectId,
        isActive: true,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_CREATED',
      entity: 'Hirac',
      entityId: hirac.id,
      newValue: hirac,
    });

    await this.redisService.del(`project:${projectId}`);
    return hirac;
  }

  // ─── Update HIRAC (hanya saat DRAFT / REVISION) ──────────────────────────────
  async updateHirac(id: string, data: Partial<CreateHiracDto>, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');
    if (!hirac.isActive)
      throw new BadRequestException('Cannot update an inactive HIRAC row');

    await this.validateProjectEditable(hirac.projectId);

    const { penilaianAwal, penilaianLanjutan, ...rest } = data;
    const updateData: Record<string, any> = { ...rest };

    if (data.no !== undefined) {
      updateData.no = data.no ? (data.no as any) : null;
    }

    if (penilaianAwal) {
      updateData.penilaianAwalAkibat = penilaianAwal.akibat;
      updateData.penilaianAwalKemungkinan = penilaianAwal.kemungkinan;
      updateData.penilaianAwalTingkatRisiko = penilaianAwal.tingkatRisiko;
    }

    if (penilaianLanjutan) {
      updateData.penilaianLanjutanAkibat = penilaianLanjutan.akibat;
      updateData.penilaianLanjutanKemungkinan = penilaianLanjutan.kemungkinan;
      updateData.penilaianLanjutanTingkatRisiko =
        penilaianLanjutan.tingkatRisiko;
    }

    const updatedHirac = await this.prisma.hirac.update({
      where: { id },
      data: updateData,
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_UPDATED',
      entity: 'Hirac',
      entityId: id,
      newValue: updatedHirac,
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return updatedHirac;
  }

  // ─── Soft-delete HIRAC (isActive = false) ────────────────────────────────────
  async deleteHirac(id: string, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');

    await this.validateProjectEditable(hirac.projectId);

    await this.prisma.hirac.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_DELETED',
      entity: 'Hirac',
      entityId: id,
      metadata: { softDelete: true },
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return { success: true, message: 'HIRAC removed from project' };
  }

  // ─── Restore HIRAC yang pernah di-soft-delete ───────────────────────────────
  async restoreHirac(id: string, userId: string) {
    const hirac = await this.prisma.hirac.findUnique({
      where: { id },
      select: { projectId: true, isActive: true },
    });

    if (!hirac || !hirac.projectId)
      throw new NotFoundException('Hirac not found');
    if (hirac.isActive)
      throw new BadRequestException('HIRAC is already active');

    await this.validateProjectEditable(hirac.projectId);

    const restored = await this.prisma.hirac.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_RESTORED',
      entity: 'Hirac',
      entityId: id,
    });

    await this.redisService.del(`project:${hirac.projectId}`);
    return restored;
  }

  /**
   * Mengenerasi template Excel untuk registrasi HIRAC (Format IBPRP Profesional dengan Dropdowns)
   */
  async generateRegisterTemplate(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { unitKerja: true, lokasiKerja: true, tanggal: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('IBPRP');

    // Title
    worksheet.mergeCells('A1:R1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value =
      'IDENTIFIKASI BAHAYA PENILAIAN RISIKO PENGENDALIAN (IBPRP)';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Metadata
    worksheet.getRow(2).values = [
      `Unit Kerja : ${project.unitKerja}`,
      '',
      '',
      `Lokasi Pekerjaan : ${project.lokasiKerja || '-'}`,
      '',
      '',
      `Tanggal Penilaian : ${project.tanggal || '-'}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Revisi : 00',
    ];

    // Table Headers
    const headers1 = [
      'No',
      'Kegiatan',
      'R/NR/E',
      'Identifikasi Bahaya (4M+1E)',
      'Akibat / Risiko K3L',
      'Penilaian Risiko Awal',
      '',
      '',
      'Risiko Dapat Diterima? (Y/N)',
      'Peraturan Perundangan',
      'Pengendalian Risiko (Eliminasi, Substitusi, Rekayasa, Adm, APD)',
      'Penilaian Risiko Lanjutan',
      '',
      '',
      'Risiko Dapat Diterima? (Y/N)',
      'Peluang',
      'PIC Pengendalian',
      'Status',
    ];

    const headers2 = [
      '',
      '',
      '',
      '',
      '',
      'Akibat',
      'Peluang',
      'Tingkat',
      '',
      '',
      '',
      'Akibat',
      'Peluang',
      'Tingkat',
      '',
      '',
      '',
      '',
    ];

    worksheet.getRow(4).values = headers1;
    worksheet.getRow(5).values = headers2;

    // Merging Headers
    worksheet.mergeCells('A4:A5'); // No
    worksheet.mergeCells('B4:B5'); // Kegiatan
    worksheet.mergeCells('C4:C5'); // R/NR/E
    worksheet.mergeCells('D4:D5'); // Bahaya
    worksheet.mergeCells('E4:E5'); // Akibat
    worksheet.mergeCells('F4:H4'); // Penilaian Awal
    worksheet.mergeCells('L4:N4'); // Penilaian Lanjutan

    // Styling Headers
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(5).font = { bold: true };
    worksheet.getRow(4).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    worksheet.getRow(5).alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    // Set Column Widths
    worksheet.columns = [
      { key: 'no', width: 10 },
      { key: 'kegiatan', width: 30 },
      { key: 'kategori', width: 15 },
      { key: 'bahaya', width: 35 },
      { key: 'akibat_risiko', width: 30 },
      { key: 'awal_akibat', width: 10 },
      { key: 'awal_peluang', width: 10 },
      { key: 'awal_tingkat', width: 15 },
      { key: 'awal_accept', width: 15 },
      { key: 'peraturan', width: 25 },
      { key: 'pengendalian', width: 45 },
      { key: 'lanjut_akibat', width: 10 },
      { key: 'lanjut_peluang', width: 10 },
      { key: 'lanjut_tingkat', width: 15 },
      { key: 'lanjut_accept', width: 15 },
      { key: 'peluang_notes', width: 20 },
      { key: 'pic', width: 20 },
      { key: 'status', width: 15 },
    ];

    // Add Data Validations (Dropdowns) for rows 6 to 100
    for (let i = 6; i <= 100; i++) {
      // C: R/NR/E
      worksheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"R,NR,E"'],
      };
      // F & L: Akibat (1-5)
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,2,3,4,5"'],
      };
      worksheet.getCell(`L${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"1,2,3,4,5"'],
      };
      // G & M: Peluang (A-E)
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"A,B,C,D,E"'],
      };
      worksheet.getCell(`M${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"A,B,C,D,E"'],
      };
      // H & N: Tingkat Risiko (E, H, M, L)
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"E,H,M,L"'],
      };
      worksheet.getCell(`N${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"E,H,M,L"'],
      };
      // I & O: Y/N
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Y,N"'],
      };
      worksheet.getCell(`O${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Y,N"'],
      };
      // R: Status
      worksheet.getCell(`R${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"OPEN,CLOSED"'],
      };
    }

    // Add Example Data
    worksheet.getRow(6).values = [
      'P',
      'Pekerjaan Sipil',
      'R',
      'Man: Posisi tubuh tidak ergonomis',
      'Fatigue / Low Back Pain',
      '3',
      'D',
      'M',
      'N',
      'Permenaker No 5 2018',
      'Adm: Istirahat periodik, Stretching sebelum bekerja',
      '1',
      'D',
      'L',
      'Y',
      'Peningkatan produktivitas',
      'HSE Team',
      'OPEN',
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Bulk upload HIRAC dari file Excel ke Project tertentu
   */
  async bulkRegisterHirac(
    projectId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    await this.validateProjectEditable(projectId);

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Excel file is empty');

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref'])
      throw new BadRequestException('Worksheet is empty');

    // Start from row 6 (index 5) - adjusted for IBPRP format
    // Use header: 1 to get an array of arrays (AOA) for reliable index access
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      range: 5, // Start from Row 6
    });

    const validHiracs: any[] = [];
    
    // State to track last activity data for inheritance
    let lastNo = '';
    let lastKegiatan = '';
    let lastKategori: ActivityCategory | null = null;

    for (const [index, row] of rawData.entries()) {
      // row is now an array of values based on column order
      // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17
      
      // Helper to safely get and normalize string values
      const getVal = (idx: number, fallback = '') => String(row[idx] || fallback).trim();
      
      const colKegiatan = row[1];
      const colBahaya = row[3];
      
      // Update inherited values if the current row has a new activity name
      if (colKegiatan) {
          lastNo = row[0] ? String(row[0]).trim() : String(index + 1);
          lastKegiatan = String(colKegiatan).trim();
          
          const rawKategori = getVal(2).toUpperCase();
          lastKategori = ['R', 'NR', 'E'].includes(rawKategori) 
            ? rawKategori as ActivityCategory 
            : ActivityCategory.R;
      }

      // Skip row if no hazard identification is present
      if (!colBahaya) continue;

      // Ensure we have activity context
      if (!lastKegiatan) continue;

      // Validate Risk Levels (Map full names to initials L, M, H, E)
      const normalizeRisk = (val: string): RiskLevel => {
          const v = val.toUpperCase();
          if (v === 'LOW' || v === 'L') return 'L' as RiskLevel;
          if (v === 'MEDIUM' || v === 'M') return 'M' as RiskLevel;
          if (v === 'HIGH' || v === 'H') return 'H' as RiskLevel;
          if (v === 'EXTREME' || v === 'E') return 'E' as RiskLevel;
          return 'L' as RiskLevel;
      };

      validHiracs.push({
        no: lastNo as any,
        kegiatan: lastKegiatan,
        kategori: lastKategori || ActivityCategory.R,
        identifikasiBahaya: String(colBahaya).trim(),
        akibatRisiko: getVal(4),
        penilaianAwalAkibat: parseInt(getVal(5, '0')),
        penilaianAwalKemungkinan: getVal(6, 'A').toUpperCase(),
        penilaianAwalTingkatRisiko: normalizeRisk(getVal(7, 'L')),
        risikoDapatDiterimaAwal: getVal(8).toUpperCase() === 'Y',
        peraturanTerkait: row[9] ? String(row[9]).trim() : null,
        pengendalian: getVal(10),
        penilaianLanjutanAkibat: parseInt(getVal(11, '0')), 
        penilaianLanjutanKemungkinan: getVal(12, 'A').toUpperCase(),
        penilaianLanjutanTingkatRisiko: normalizeRisk(getVal(13, 'L')),
        risikoDapatDiterimaLanjutan: getVal(14).toUpperCase() === 'Y',
        peluang: row[15] ? String(row[15]).trim() : null,
        picId: row[16] ? String(row[16]).trim() : null,
        status: (getVal(17, 'OPEN').toUpperCase() as StatusControl) || StatusControl.OPEN,
        projectId,
        isActive: true,
      });
    }

    const result = await this.prisma.hirac.createMany({
      data: validHiracs,
    });

    await this.auditLogService.log({
      userId,
      action: 'HIRAC_BULK_CREATED',
      entity: 'Hirac',
      metadata: {
        projectId,
        count: result.count,
      },
    });

    await this.redisService.del(`project:${projectId}`);
    return result;
  }
}
