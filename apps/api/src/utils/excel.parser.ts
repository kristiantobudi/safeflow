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
