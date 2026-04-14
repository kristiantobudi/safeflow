'use client';

import { useEffect, useRef, useMemo } from 'react';

import {
  Dialog as ShadDialog,
  DialogContent as ShadDialogContent,
} from '@repo/ui/components/ui/dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Printer, X } from 'lucide-react';

interface HiracPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  projectInfo?: {
    unitKerja?: string;
    lokasiKerja?: string;
    tanggal?: string;
  };
}

export function HiracPreviewModal({
  open,
  onOpenChange,
  data,
  projectInfo,
}: HiracPreviewModalProps) {
  // Inject print CSS when modal is open
  useEffect(() => {
    if (!open) return;
    const styleId = 'ibprp-print-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @media print {
        body > *:not([data-slot="dialog-portal"]) { display: none !important; }
        [data-slot="dialog-overlay"] { display: none !important; }
        [data-slot="dialog-content"] {
          position: static !important;
          transform: none !important;
          max-width: 100vw !important;
          width: 100% !important;
          height: auto !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          background: white !important;
        }
        .print\\:hidden { display: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A3 landscape; margin: 10mm; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [open]);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
    <html>
      <head>
        <title>IBPRP</title>
        <style>
          @page { size: A3 landscape; margin: 10mm; }
          body { margin: 0; font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; }
          * { -webkit-print-color-adjust: exact !important; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const processedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const noA = String(a.no || '');
      const noB = String(b.no || '');
      const noComp = noA.localeCompare(noB, undefined, { numeric: true });
      if (noComp !== 0) return noComp;
      return String(a.kegiatan).localeCompare(String(b.kegiatan));
    });

    const result: any[] = [];
    let i = 0;
    while (i < sorted.length) {
      const current = sorted[i];
      if (current.isSectionHeader) {
        result.push(current);
        i++;
        continue;
      }
      let span = 1;
      let j = i + 1;
      while (
        j < sorted.length &&
        !sorted[j].isSectionHeader &&
        String(sorted[j].no) === String(current.no) &&
        String(sorted[j].kegiatan) === String(current.kegiatan)
      ) {
        span++;
        j++;
      }
      result.push({ ...current, rowSpan: span, isGroupStart: true });
      for (let k = 1; k < span; k++) {
        result.push({ ...sorted[i + k], rowSpan: 0, isGroupStart: false });
      }
      i = j;
    }
    return result;
  }, [data]);

  const getRiskBgColor = (level: string) => {
    const l = level?.toUpperCase();
    if (l === 'E' || l === 'EXTREME') return { bg: '#FF0000', text: '#ffffff' };
    if (l === 'H' || l === 'HIGH') return { bg: '#FF8C00', text: '#ffffff' };
    if (l === 'M' || l === 'MEDIUM') return { bg: '#FFFF00', text: '#000000' };
    if (l === 'L' || l === 'LOW') return { bg: '#00B050', text: '#ffffff' };
    return { bg: '#ffffff', text: '#000000' };
  };

  const TOTAL_COLS = 19;

  // Vertical text style — the only reliable cross-browser approach
  const verticalTextStyle: React.CSSProperties = {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  };

  return (
    <ShadDialog open={open} onOpenChange={onOpenChange}>
      <ShadDialogContent
        className="sm:max-w-[99vw] w-full h-[98vh] flex flex-col p-3 overflow-hidden border-none bg-zinc-300/60 backdrop-blur-sm shadow-2xl rounded-xl"
        showCloseButton={false}
      >
        {/* Floating action bar */}
        <div className="absolute top-6 right-10 z-50 flex gap-3 print:hidden">
          <Button
            className="gap-2 h-10 px-6 rounded-full font-black bg-primary shadow-lg hover:scale-105 transition-transform text-sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 bg-white overflow-auto rounded-lg">
          <div ref={printRef} className="min-w-[2600px] p-8 bg-white">
            {/* ── DOCUMENT HEADER ── */}
            <div className="border-[1.5px] border-black">
              {/* Row 1: Logo | Title | Date/Revision */}
              <div className="flex border-b-[1.5px] border-black">
                <div className="w-[200px] shrink-0 border-r-[1.5px] border-black p-3 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 bg-[#004A99] flex items-center justify-center text-white font-black text-[10px] italic">
                      WIKA
                    </div>
                    <div className="h-10 w-10 border border-gray-300 flex items-center justify-center text-[8px] text-gray-500 font-bold">
                      RAU
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-[#004A99] text-center leading-tight">
                    PT WIKA-RAU, KSO
                  </span>
                </div>
                <div className="flex-1 border-r-[1.5px] border-black p-4 flex items-center justify-center">
                  <h1 className="text-[20px] font-black text-center leading-tight">
                    IDENTIFIKASI BAHAYA PENILAIAN RISIKO PENGENDALIAN (IBPRP)
                  </h1>
                </div>
                <div className="w-[240px] shrink-0 p-4 flex flex-col justify-center gap-3">
                  <div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                      Tanggal Penilaian
                    </div>
                    <div className="text-[12px] font-black">
                      {projectInfo?.tanggal || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                      Revisi
                    </div>
                    <div className="text-[12px] font-black">00</div>
                  </div>
                </div>
              </div>
              {/* Row 2: Unit Kerja | Lokasi */}
              <div className="flex">
                <div className="flex-1 border-r-[1.5px] border-black p-2">
                  <span className="text-[10px] font-bold text-gray-500">
                    Unit Kerja :{' '}
                  </span>
                  <span className="text-[11px] font-black uppercase">
                    {projectInfo?.unitKerja || '-'}
                  </span>
                </div>
                <div className="flex-1 p-2">
                  <span className="text-[10px] font-bold text-gray-500">
                    Lokasi Pekerjaan :{' '}
                  </span>
                  <span className="text-[11px] font-black uppercase">
                    {projectInfo?.lokasiKerja || '-'}
                  </span>
                </div>
              </div>
            </div>
            {/* ── END HEADER ── */}

            {/* ── MAIN IBPRP TABLE ── */}
            <table
              style={{
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                width: '100%',
                fontSize: '11px',
              }}
              className="border-[1.5px] border-black"
            >
              <colgroup>
                <col style={{ width: '50px' }} /> {/* No */}
                <col style={{ width: '290px' }} /> {/* Kegiatan */}
                <col style={{ width: '48px' }} /> {/* R/NR/E */}
                <col style={{ width: '440px' }} /> {/* Identifikasi Bahaya */}
                <col style={{ width: '240px' }} /> {/* Akibat/Risiko K3L */}
                <col style={{ width: '48px' }} /> {/* Awal: Akibat */}
                <col style={{ width: '48px' }} /> {/* Awal: Kemungkinan */}
                <col style={{ width: '56px' }} /> {/* Awal: Tingkat */}
                <col style={{ width: '76px' }} /> {/* Awal: Diterima */}
                <col style={{ width: '240px' }} /> {/* Peraturan */}
                <col style={{ width: '480px' }} /> {/* Pengendalian */}
                <col style={{ width: '48px' }} /> {/* Lanjutan: Akibat */}
                <col style={{ width: '48px' }} /> {/* Lanjutan: Kemungkinan */}
                <col style={{ width: '56px' }} /> {/* Lanjutan: Tingkat */}
                <col style={{ width: '76px' }} /> {/* Lanjutan: Diterima */}
                <col style={{ width: '170px' }} /> {/* Peluang */}
                <col style={{ width: '170px' }} /> {/* PIC */}
                <col style={{ width: '96px' }} /> {/* Status */}
              </colgroup>

              <thead style={{ backgroundColor: '#f2f2f2' }}>
                {/* Row 1 — main headers */}
                <tr style={{ borderBottom: '1.5px solid black' }}>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Kegiatan
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      lineHeight: 1.2,
                    }}
                  >
                    R/
                    <br />
                    NR/
                    <br />E
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Identifikasi Bahaya (4M+1E)
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Akibat / Risiko K3L
                  </th>

                  {/* Penilaian Risiko Awal */}
                  <th
                    colSpan={3}
                    style={{
                      border: '1px solid black',
                      padding: '4px',
                      fontWeight: 900,
                      textAlign: 'center',
                      backgroundColor: '#d9d9d9',
                      borderBottom: '1.5px solid black',
                    }}
                  >
                    Penilaian Risiko Awal
                  </th>

                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '9px',
                      lineHeight: 1.3,
                    }}
                  >
                    Risiko Dapat
                    <br />
                    Diterima?
                    <br />
                    (Y/N)
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '10px',
                    }}
                  >
                    Peraturan Perundangan &amp;
                    <br />
                    Persyaratan Lainnya
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Pengendalian Risiko
                    <div
                      style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        color: '#555',
                        marginTop: '2px',
                      }}
                    >
                      Eliminasi (1), Substitusi (2), Rekayasa Engineering (3),
                      Administrasi (4), APD (5)
                    </div>
                  </th>

                  {/* Penilaian Risiko Lanjutan */}
                  <th
                    colSpan={3}
                    style={{
                      border: '1px solid black',
                      padding: '4px',
                      fontWeight: 900,
                      textAlign: 'center',
                      backgroundColor: '#d9d9d9',
                      borderBottom: '1.5px solid black',
                    }}
                  >
                    Penilaian Risiko Lanjutan
                  </th>

                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '9px',
                      lineHeight: 1.3,
                    }}
                  >
                    Risiko Dapat
                    <br />
                    Diterima?
                    <br />
                    (Y/N)
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Peluang
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    PIC Pengendalian Risiko
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '6px',
                      fontWeight: 900,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Status Pengendalian Risiko
                  </th>
                </tr>

                {/* Row 2 — vertical sub-headers */}
                <tr style={{ backgroundColor: '#efefef' }}>
                  {/* Awal */}
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}
                  >
                    <span style={verticalTextStyle}>Akibat</span>
                  </th>
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}
                  >
                    <span style={verticalTextStyle}>Kemungkinan Terjadi</span>
                  </th>
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                      backgroundColor: '#e0e0e0',
                    }}
                  >
                    <span style={verticalTextStyle}>Tingkat Risiko</span>
                  </th>
                  {/* Lanjutan */}
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}
                  >
                    <span style={verticalTextStyle}>Akibat</span>
                  </th>
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                    }}
                  >
                    <span style={verticalTextStyle}>Kemungkinan Terjadi</span>
                  </th>
                  <th
                    style={{
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: '110px',
                      fontSize: '9px',
                      fontWeight: 900,
                      backgroundColor: '#e0e0e0',
                    }}
                  >
                    <span style={verticalTextStyle}>Tingkat Risiko</span>
                  </th>
                </tr>
              </thead>

              <tbody style={{ color: 'black' }}>
                {processedData.map((item, i) => {
                  if (item.isSectionHeader) {
                    return (
                      <tr
                        key={item.id ?? `sh-${i}`}
                        style={{
                          backgroundColor: '#f5f5f5',
                          borderBottom: '1.5px solid black',
                        }}
                      >
                        <td
                          colSpan={TOTAL_COLS}
                          style={{
                            border: '1px solid black',
                            padding: '4px 8px',
                            fontWeight: 900,
                            fontSize: '12px',
                          }}
                        >
                          {item.label}
                        </td>
                      </tr>
                    );
                  }

                  const awalColor = getRiskBgColor(
                    item.penilaianAwalTingkatRisiko,
                  );
                  const lanjutanColor = getRiskBgColor(
                    item.penilaianLanjutanTingkatRisiko,
                  );

                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #ccc' }}
                    >
                      {item.isGroupStart && (
                        <>
                          <td
                            rowSpan={item.rowSpan}
                            style={{
                              border: '1px solid black',
                              padding: '6px',
                              textAlign: 'center',
                              verticalAlign: 'top',
                              fontWeight: 900,
                            }}
                          >
                            {item.no}
                          </td>
                          <td
                            rowSpan={item.rowSpan}
                            style={{
                              border: '1px solid black',
                              padding: '6px',
                              verticalAlign: 'top',
                              fontWeight: 900,
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.kegiatan}
                          </td>
                          <td
                            rowSpan={item.rowSpan}
                            style={{
                              border: '1px solid black',
                              padding: '6px',
                              textAlign: 'center',
                              verticalAlign: 'top',
                              fontWeight: 900,
                            }}
                          >
                            {item.kategori}
                          </td>
                        </>
                      )}

                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                        }}
                      >
                        {item.identifikasiBahaya}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                        }}
                      >
                        {item.akibatRisiko}
                      </td>

                      {/* Penilaian Awal */}
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.penilaianAwalAkibat}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.penilaianAwalKemungkinan}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 900,
                          backgroundColor: awalColor.bg,
                          color: awalColor.text,
                        }}
                      >
                        {item.penilaianAwalTingkatRisiko}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.risikoDapatDiterimaAwal ? 'Y' : 'N'}
                      </td>

                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                          fontStyle: 'italic',
                          fontSize: '10px',
                        }}
                      >
                        {item.peraturanTerkait || '-'}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                          whiteSpace: 'pre-line',
                          lineHeight: 1.5,
                        }}
                      >
                        {item.pengendalian}
                      </td>

                      {/* Penilaian Lanjutan */}
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.penilaianLanjutanAkibat}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.penilaianLanjutanKemungkinan}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 900,
                          backgroundColor: lanjutanColor.bg,
                          color: lanjutanColor.text,
                        }}
                      >
                        {item.penilaianLanjutanTingkatRisiko}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.risikoDapatDiterimaLanjutan ? 'Y' : 'N'}
                      </td>

                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                          fontStyle: 'italic',
                          color: '#555',
                        }}
                      >
                        {item.peluang || '-'}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          verticalAlign: 'top',
                          fontWeight: 700,
                        }}
                      >
                        {item.picId || '-'}
                      </td>
                      <td
                        style={{
                          border: '1px solid black',
                          padding: '6px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          fontSize: '10px',
                        }}
                      >
                        {item.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── REFERENCE LEGEND TABLE (matches the screenshot) ── */}
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                fontSize: '10px',
                marginTop: '8px',
                border: '1px solid black',
              }}
            >
              <thead>
                <tr>
                  {/* Tingkat Risiko block */}
                  <th
                    colSpan={6}
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      backgroundColor: '#d9d9d9',
                      fontWeight: 900,
                      fontSize: '11px',
                    }}
                  >
                    Tingkat Risiko
                  </th>
                  {/* Kemungkinan Terjadi block */}
                  <th
                    colSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      backgroundColor: '#d9d9d9',
                      fontWeight: 900,
                      fontSize: '11px',
                    }}
                  >
                    Kemungkinan Terjadi
                  </th>
                  {/* Akibat block */}
                  <th
                    colSpan={2}
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      backgroundColor: '#d9d9d9',
                      fontWeight: 900,
                      fontSize: '11px',
                    }}
                  >
                    Akibat
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1 */}
                <tr>
                  {/* Risk matrix header row */}
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    Tingkat
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    1
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    2
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    3
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    4
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#d9d9d9',
                    }}
                  >
                    5
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    E
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Hampir pasti akan terjadi (Almost certain)/terkali dalam
                    &lt; 1 bulan
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    1
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Tidak ada cedera atau kerugian materi &lt; Rp 5 juta
                  </td>
                </tr>
                {/* Row 2 */}
                <tr>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#FF0000',
                      color: 'white',
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    D
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Cenderung untuk terjadi (Likely)/sekali dalam 1 - 6 bulan
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    2
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Cedera ringan/First aid atau kerugian materi Rp 5 - 25 juta
                  </td>
                </tr>
                {/* Row 3 */}
                <tr>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#FF8C00',
                      color: 'white',
                    }}
                  >
                    H
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF8C00',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    H
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    E
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    C
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Mungkin dapat terjadi (Possible)/sekali dalam 6 - 12 bulan
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    3
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    STMB atau kerugian materi Rp 26 - 300 juta
                  </td>
                </tr>
                {/* Row 4 */}
                <tr>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#FFFF00',
                      color: 'black',
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#00B050',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    L
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF8C00',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    H
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF8C00',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    H
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    B
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Kecil kemungkinan terjadi (Unlikely)/sekali dalam 1 - 5
                    tahun
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    4
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Cacat atau kerugian Rp 31 - 300 juta
                  </td>
                </tr>
                {/* Row 5 */}
                <tr>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px 6px',
                      textAlign: 'center',
                      fontWeight: 900,
                      backgroundColor: '#00B050',
                      color: 'white',
                    }}
                  >
                    L
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#00B050',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    L
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#00B050',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    L
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FFFF00',
                      color: 'black',
                      fontWeight: 700,
                    }}
                  >
                    M
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      backgroundColor: '#FF8C00',
                      color: 'white',
                      fontWeight: 700,
                    }}
                  >
                    H
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    A
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Jarang terjadi (Rare)/&gt; 3 tahun
                  </td>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '3px',
                      textAlign: 'center',
                      fontWeight: 900,
                    }}
                  >
                    5
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px' }}>
                    Kematian atau kerugian materi &gt; Rp 100 juta
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer note */}
            <div
              style={{
                marginTop: '6px',
                textAlign: 'right',
                fontSize: '9px',
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              Dokumen ini dihasilkan secara otomatis oleh Safeflow HSE
              Management System
            </div>
          </div>
        </div>
      </ShadDialogContent>
    </ShadDialog>
  );
}
