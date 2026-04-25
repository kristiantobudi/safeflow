export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;

  buffer: Buffer; // memory storage
  stream?: NodeJS.ReadableStream; // streaming support

  filename?: string; // disk storage
  destination?: string;
  path?: string;
}
