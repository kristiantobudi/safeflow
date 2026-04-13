import * as XLSX from 'xlsx';

export function parseExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheets found in excel file');
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error(`Sheet ${firstSheetName} not found`);
  }
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row: any) => ({
    question: row.question,
    options: [row.optionA, row.optionB, row.optionC, row.optionD],
    correctAnswer: row.correctAnswer,
  }));
}

export function parseExcelRegisterUser(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheets found in excel file');
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error(`Sheet ${firstSheetName} not found`);
  }
  const rows = XLSX.utils.sheet_to_json(sheet);

  return rows.map((row: any) => ({
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    username: row.username,
    password: row.password,
  }));
}

export function parseExcelRegisterWorkerVendor(input: Buffer | string) {
  const workbook =
    typeof input === 'string'
      ? XLSX.readFile(input)
      : XLSX.read(input, { type: 'buffer' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('No sheets found in excel file');
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) throw new Error(`Sheet ${firstSheetName} not found`);

  // Baca semua baris sebagai array of arrays untuk pemindaian header
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  if (allRows.length === 0) return [];

  // Cari index baris header (yang mengandung 'lengkap' atau 'nama')
  const headerRowIdx = allRows.findIndex(
    (row) =>
      row &&
      row.some((cell) => {
        const c = cell?.toString().toLowerCase();
        return c && (c.includes('lengkap') || c.includes('nama'));
      }),
  );

  if (headerRowIdx === -1) return [];

  const headers = allRows[headerRowIdx];
  if (!headers) return [];

  const dataRows = allRows.slice(headerRowIdx + 1);

  // Cari index kolom berdasarkan kata kunci (case-insensitive)
  const findIdx = (keywords: string[]) =>
    headers.findIndex(
      (h) =>
        h &&
        keywords.some((k) =>
          h.toString().toLowerCase().includes(k.toLowerCase()),
        ),
    );

  const idxName = findIdx(['nama lengkap', 'pekerja', 'nama']);
  const idxPhone = findIdx(['phone', 'telepon', 'hp', 'telp']);
  const idxAddress = findIdx(['alamat']);
  const idxVendor = findIdx(['vendor']);
  const idxStatus = findIdx(['status']);

  return dataRows
    .filter((row) => row.length > 0 && (row[idxName] || row[idxPhone])) // Filter baris kosong
    .map((row) => ({
      name: row[idxName]?.toString().trim(),
      phone: row[idxPhone]?.toString().trim(),
      address: row[idxAddress]?.toString().trim() || '',
      status: row[idxStatus]?.toString().trim() || 'ACTIVE',
      vendorName: row[idxVendor]?.toString().trim(),
    }));
}
