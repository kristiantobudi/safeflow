export const COMPARABLE_FIELDS = [
  'kegiatan',
  'kategori',
  'identifikasiBahaya',
  'akibatRisiko',
  'penilaianAwalAkibat',
  'penilaianAwalKemungkinan',
  'penilaianAwalTingkatRisiko',
  'risikoDapatDiterimaAwal',
  'peraturanTerkait',
  'pengendalian',
  'penilaianLanjutanAkibat',
  'penilaianLanjutanKemungkinan',
  'penilaianLanjutanTingkatRisiko',
  'risikoDapatDiterimaLanjutan',
  'peluang',
  'picId',
  'status',
];

export function isModified(
  a: Record<string, any>,
  b: Record<string, any>,
): boolean {
  return COMPARABLE_FIELDS.some((f) => a[f] !== b[f]);
}
