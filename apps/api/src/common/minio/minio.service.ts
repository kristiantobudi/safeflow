import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinioService as NestMinioService } from 'nestjs-minio-client';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName: string;

  constructor(
    private readonly minioClient: NestMinioService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'safeflow-assets',
    );
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const bucketExists = await this.minioClient.client.bucketExists(
        this.bucketName,
      );
      if (!bucketExists) {
        await this.minioClient.client.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" created successfully.`);
      }
    } catch (error: any) {
      this.logger.error(
        `Error checking/creating bucket: ${error?.message || error}`,
      );
    }
  }

  /**
   * Mengunggah file ke MinIO dan mengembalikan Object Key (path)
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = '',
  ): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    try {
      await this.minioClient.client.putObject(
        this.bucketName,
        filePath,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      // Kita hanya mengembalikan path relatif saja, agar lebih fleksibel dan aman
      return filePath;
    } catch (error: any) {
      this.logger.error(
        `Error uploading file to MinIO: ${error?.message || error}`,
      );
      throw error;
    }
  }

  /**
   * Menghasilkan Temporary Presigned URL untuk akses file
   * Default expiry: 1 jam (3600 detik)
   */
  async getFileUrl(
    key: string | null | undefined,
    expiry: number = 3600,
  ): Promise<string> {
    if (!key) return '';

    // Jika key sudah berupa URL (data lama), kembalikan apa adanya atau bersihkan
    if (key.startsWith('http')) {
      return key;
    }

    try {
      return await this.minioClient.client.presignedGetObject(
        this.bucketName,
        key,
        expiry,
      );
    } catch (error: any) {
      this.logger.error(
        `Error generating presigned URL: ${error?.message || error}`,
      );
      return '';
    }
  }

  /**
   * Menghapus file dari bucket berdasarkan Object Key
   */
  async deleteFile(key: string): Promise<void> {
    if (!key) return;

    try {
      let objectName = key;

      // Jika key berupa URL lengkap (migrasi data lama), ekstrak object name-nya
      if (key.startsWith('http')) {
        try {
          const url = new URL(key);
          const pathParts = url.pathname.split('/').filter((p) => p !== '');
          if (pathParts[0] === this.bucketName) {
            objectName = pathParts.slice(1).join('/');
          }
        } catch (e) {
          // Bukan URL valid atau format beda, asumsikan key adalah object name
        }
      }

      await this.minioClient.client.removeObject(this.bucketName, objectName);
      this.logger.log(`Deleted object "${objectName}" from MinIO.`);
    } catch (error: any) {
      this.logger.error(
        `Error deleting file from MinIO: ${error?.message || error}`,
      );
    }
  }
}
