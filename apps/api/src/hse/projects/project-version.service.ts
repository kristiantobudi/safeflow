import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { isModified, COMPARABLE_FIELDS } from 'helper/constant/version.helper';
import { DiffType, VersionStatus } from '@repo/database/generated/client';

@Injectable()
export class ProjectVersionService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Snapshot semua Hirac aktif ke versi baru ────────────────────────────────
  async createSnapshot(
    projectId: string,
    submittedBy: string,
    label?: string,
    changeNote?: string,
    tx?: any, // Optional transaction client
  ): Promise<string> {
    const prisma = tx || this.prisma;
    // Hitung versionNumber berikutnya
    const lastVersion = await prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;

    // Ambil semua Hirac aktif milik project ini
    const hiracs = await prisma.hirac.findMany({
      where: { projectId, isActive: true },
    });

    // Ambil snapshot versi sebelumnya untuk menghitung diff
    const previousVersion =
      nextVersion > 1
        ? await this.prisma.projectVersion.findFirst({
            where: { projectId, versionNumber: nextVersion - 1 },
            include: { hiracs: true },
          })
        : null;

    const prevHiracMap = new Map(
      (previousVersion?.hiracs ?? []).map((h) => [h.hiracId, h]),
    );

    return this.prisma.$transaction(async (tx) => {
      // Buat ProjectVersion baru
      const version = await tx.projectVersion.create({
        data: {
          projectId,
          versionNumber: nextVersion,
          label: label ?? `Versi ${nextVersion}`,
          changeNote,
          status: VersionStatus.SUBMITTED,
          submittedBy,
          submittedAt: new Date(),
        },
      });

      // Snapshot setiap Hirac + hitung diffType
      const hiracVersionData = hiracs.map((h) => {
        const prev = prevHiracMap.get(h.id);
        let diffType: DiffType;

        if (!prev) {
          diffType = DiffType.ADDED;
        } else if (isModified(h as any, prev as any)) {
          diffType = DiffType.MODIFIED;
        } else {
          diffType = DiffType.UNCHANGED;
        }

        return {
          projectVersionId: version.id,
          hiracId: h.id,
          no: h.no,
          kegiatan: h.kegiatan,
          kategori: h.kategori,
          identifikasiBahaya: h.identifikasiBahaya,
          akibatRisiko: h.akibatRisiko,
          penilaianAwalAkibat: h.penilaianAwalAkibat,
          penilaianAwalKemungkinan: h.penilaianAwalKemungkinan,
          penilaianAwalTingkatRisiko: h.penilaianAwalTingkatRisiko,
          risikoDapatDiterimaAwal: h.risikoDapatDiterimaAwal,
          peraturanTerkait: h.peraturanTerkait,
          pengendalian: h.pengendalian,
          penilaianLanjutanAkibat: h.penilaianLanjutanAkibat,
          penilaianLanjutanKemungkinan: h.penilaianLanjutanKemungkinan,
          penilaianLanjutanTingkatRisiko: h.penilaianLanjutanTingkatRisiko,
          risikoDapatDiterimaLanjutan: h.risikoDapatDiterimaLanjutan,
          peluang: h.peluang,
          picId: h.picId,
          status: h.status,
          diffType,
        };
      });

      // Tandai baris yang REMOVED (ada di prev tapi tidak ada di snapshot sekarang)
      const currentHiracIds = new Set(hiracs.map((h) => h.id));
      const removedHiracs = (previousVersion?.hiracs ?? [])
        .filter((h) => h.hiracId && !currentHiracIds.has(h.hiracId))
        .map((h) => ({
          projectVersionId: version.id,
          hiracId: h.hiracId,
          no: h.no,
          kegiatan: h.kegiatan,
          kategori: h.kategori,
          identifikasiBahaya: h.identifikasiBahaya,
          akibatRisiko: h.akibatRisiko,
          penilaianAwalAkibat: h.penilaianAwalAkibat,
          penilaianAwalKemungkinan: h.penilaianAwalKemungkinan,
          penilaianAwalTingkatRisiko: h.penilaianAwalTingkatRisiko,
          risikoDapatDiterimaAwal: h.risikoDapatDiterimaAwal,
          peraturanTerkait: h.peraturanTerkait,
          pengendalian: h.pengendalian,
          penilaianLanjutanAkibat: h.penilaianLanjutanAkibat,
          penilaianLanjutanKemungkinan: h.penilaianLanjutanKemungkinan,
          penilaianLanjutanTingkatRisiko: h.penilaianLanjutanTingkatRisiko,
          risikoDapatDiterimaLanjutan: h.risikoDapatDiterimaLanjutan,
          peluang: h.peluang,
          picId: h.picId,
          status: h.status,
          diffType: DiffType.REMOVED,
        }));

      await tx.hiracVersion.createMany({
        data: [...hiracVersionData, ...removedHiracs],
      });

      return version.id;
    });
  }

  // ─── Mark versi sebagai REJECTED ────────────────────────────────────────────
  async markVersionRejected(
    projectId: string,
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<void> {
    const latestVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId, status: VersionStatus.SUBMITTED },
      orderBy: { versionNumber: 'desc' },
    });

    if (latestVersion) {
      await this.prisma.projectVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: VersionStatus.REJECTED,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNote,
        },
      });
    }
  }

  // ─── Mark versi sebagai APPROVED ────────────────────────────────────────────
  async markVersionApproved(
    projectId: string,
    reviewedBy: string,
    reviewNote?: string,
  ): Promise<void> {
    // Supersede semua versi lama
    await this.prisma.projectVersion.updateMany({
      where: { projectId, status: { not: VersionStatus.REJECTED } },
      data: { status: VersionStatus.SUPERSEDED },
    });

    // Ambil versi terakhir lalu mark APPROVED
    const latestVersion = await this.prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });

    if (latestVersion) {
      await this.prisma.projectVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: VersionStatus.APPROVED,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNote,
        },
      });
    }
  }

  // ─── List semua versi project ───────────────────────────────────────────────
  async listVersions(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.projectVersion.findMany({
      where: { projectId },
      orderBy: { versionNumber: 'asc' },
      select: {
        id: true,
        versionNumber: true,
        label: true,
        changeNote: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        reviewNote: true,
        submitter: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { hiracs: true } },
      },
    });
  }

  // ─── Compare dua versi (diff view) ─────────────────────────────────────────
  async compareVersions(projectId: string, versionA?: number, versionB?: number) {
    let vB = versionB;
    let vA = versionA;

    // Jika vB tidak diberikan, ambil versi terbaru
    if (vB === undefined) {
      const latest = await this.prisma.projectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      if (!latest) throw new NotFoundException('Project has no versions yet');
      vB = latest.versionNumber;
    }

    // Jika vA tidak diberikan, default ke vB - 1 (minimal 1)
    if (vA === undefined) {
      vA = Math.max(1, vB - 1);
    }

    const [verA, verB] = await Promise.all([
      this.prisma.projectVersion.findUnique({
        where: {
          projectId_versionNumber: { projectId, versionNumber: vA },
        },
        include: {
          hiracs: { orderBy: { no: 'asc' } },
          submitter: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.projectVersion.findUnique({
        where: {
          projectId_versionNumber: { projectId, versionNumber: vB },
        },
        include: {
          hiracs: { orderBy: { no: 'asc' } },
          submitter: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    if (!verA) throw new NotFoundException(`Version ${vA} not found`);
    if (!verB) throw new NotFoundException(`Version ${vB} not found`);

    // Buat map hiracId → versi A
    const mapA = new Map(verA.hiracs.map((h) => [h.hiracId ?? h.id, h]));

    // Buat diff result: tampilkan semua baris dari versi B + baris REMOVED dari A
    const diffRows = verB.hiracs.map((hB) => {
      const hA = mapA.get(hB.hiracId ?? hB.id);
      const diff: any = {};

      if (hA) {
        COMPARABLE_FIELDS.forEach((f) => {
          if (hB[f as keyof typeof hB] !== hA[f as keyof typeof hA]) {
            diff[f] = { old: hA[f as keyof typeof hA], new: hB[f as keyof typeof hB] };
          }
        });
      }

      return {
        hiracId: hB.hiracId,
        diffType: hB.diffType,
        current: hB,
        previous: hA ?? null,
        diff: Object.keys(diff).length > 0 ? diff : null,
      };
    });

    // Tambahkan baris yang ada di A tapi hilang di B (REMOVED)
    const bHiracIds = new Set(verB.hiracs.map((h) => h.hiracId ?? h.id));
    const removedRows = verA.hiracs
      .filter((hA) => !bHiracIds.has(hA.hiracId ?? hA.id))
      .map((hA) => ({
        hiracId: hA.hiracId,
        diffType: DiffType.REMOVED,
        current: null,
        previous: hA,
        diff: null,
      }));

    return {
      versionA: {
        versionNumber: verA.versionNumber,
        label: verA.label,
        status: verA.status,
        submittedAt: verA.submittedAt,
        submitter: verA.submitter,
      },
      versionB: {
        versionNumber: verB.versionNumber,
        label: verB.label,
        status: verB.status,
        submittedAt: verB.submittedAt,
        submitter: verB.submitter,
      },
      summary: {
        added: diffRows.filter((r) => r.diffType === DiffType.ADDED).length,
        modified: diffRows.filter((r) => r.diffType === DiffType.MODIFIED)
          .length,
        removed: removedRows.length,
        unchanged: diffRows.filter((r) => r.diffType === DiffType.UNCHANGED)
          .length,
      },
      rows: [...diffRows, ...removedRows],
    };
  }
}
