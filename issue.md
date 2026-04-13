# Implementasi Setup MinIO dan CRUD Vendor dengan File Upload

Rencana ini bertujuan untuk menyelesaikan _issue_ terkait penambahan fitur CRUD pada entitas Vendor yang dilengkapi dengan fitur upload `logo` menggunakan penyimpanan S3-compatible, yaitu MinIO.

Sejauh ini, API backend (NestJS) belum dikonfigurasi untuk MinIO dan modul Vendor baru memiliki sebagian logic CRUD (Create & Update tanpa file upload).

## User Review Required

> [!NOTE]
> Rencana ini telah diperbarui sesuai instruksi untuk menggunakan _module wrapper_ `nestjs-minio-client` dipadu library bawaan `minio`, serta menyertakan proses penghapusan otomatis (_auto-delete_) file logo pada _bucket_ apabila pengguna melakukan pembaruan (update) gambar vendor. File yang disimpan ke MinIO berada dalam bentuk objek biner (_blob_) dengan tipe konten (Content-Type) yang menyesuaikan _mime type_ asli file yang diunggah.

## Proposed Changes

---

### Lingkungan Environment & Dependencies

Penambahan _package dependencies_ dan penyesuaian file `.env`.

#### [MODIFY] package.json (di dalam folder apps/api)

- Install library wrapper `nestjs-minio-client` serta library utamanya `minio` dengan command `bun add nestjs-minio-client minio`.
- Install `@nestjs/platform-express` dan `multer` (biasanya telah ter-install pada NextJS bawaan, jika belum pastikan untuk interceptor _file upload_).

#### [MODIFY] .env

- Tambahkan konfigurasi _environment variables_ untuk MinIO Client:
  ```env
  MINIO_ENDPOINT=localhost
  MINIO_PORT=9000
  MINIO_USE_SSL=false
  MINIO_ACCESS_KEY=your_minio_access_key
  MINIO_SECRET_KEY=your_minio_secret_key
  MINIO_BUCKET_NAME=safeflow-assets
  ```

---

### MinIO Storage Service Component

Membuat Modul dan Service _reusable_ untuk berinteraksi dengan server MinIO localhost:9000.

#### [NEW] apps/api/src/common/minio/minio.module.ts

- Lakukan _import_ modul `NestMinioModule.registerAsync()` atau langsung konfigurasikan dari environment variable agar terhubung. Modul ini di set `@Global()`.

#### [NEW] apps/api/src/common/minio/minio.service.ts

- Lakukan metode _Inject_ client SDK Minio dari _wrapper_ `nestjs-minio-client`.
- Buat fungsi `uploadFile(file: Express.Multer.File, folderName: string): Promise<string>` yang mana file ini adalah berupa file _blob_/_binary_. Fungsi ini juga bertugas me-return _string URL_ menuju tempat file di bucket minIO.
- Buat fungsi `deleteFile(fileUrl: string): Promise<void>` untuk menghilangkan referensi _blob object_ lama di _bucket_ tersebut berdasarkan URL yang di-pass.

#### [MODIFY] apps/api/src/app.module.ts

- Import `MinioModule` yang baru dibuat agar terdaftar di dalam _container_ NestJS.

---

### Vendor Component

Menyesuaikan logic controller dan service pada Vendor agar mendukung interceptor Multer dalam menerima file, memproses ke MinIO, dan melengkapi `Get` serta `Delete`.

#### [MODIFY] apps/api/src/hse/vendor/vendor.controller.ts

- Tambahkan import `FileInterceptor` dari `@nestjs/platform-express`.
- Tambahkan dekorator `@UseInterceptors(FileInterceptor('logo'))` pada _route_ `@Post()` (addVendor) dan `@Patch(':id')` (updateVendor).
- Tambahkan _parameter_ `@UploadedFile() file: Express.Multer.File` ke kedua method tersebut.
- Teruskan object parameter `file` ke dalam eksekusi VendorService.
- Tambahkan _route_ baru untuk _read_ dan _delete_:
  - `@Get()` untuk memanggil daftar seluruh file Vendor.
  - `@Get(':id')` untuk menampilkan single Vendor.
  - `@Delete(':id')` untuk menghapus data Vendor (bisa berupa hard-delete atau update `.isDeleted` field).

#### [MODIFY] apps/api/src/hse/vendor/vendor.service.ts

- Lakukan _Inject_ `MinioService` melalui konstruktor kelas.
- Di method `addVendor`: Cek tipe parameter data `file`. Jika ada isinya, panggil `await minioService.uploadFile(file)`. Ambil ekstensi _URL_ return, lalu _assign_ nilai tersebut ke property `data.vendorLogo` sebelum disimpan ke _DB Prisma_.
- Di method `updateVendor`: Lakukan verifikasi database vendor terlebih dahulu. Bila file di-upload, jalankan skrip penghapusan file S3 logo lama meggunakan fungsi `await minioService.deleteFile(oldData.vendorLogo)`, lantas _upload_ kembali logo yang baru.
- _Update_ skrip lain untuk `deleteVendor` yang di dalamnya ikut menghapus file MinIO _blob_ dan implementasi standar CRUD `getAllVendors` dan `getVendorById`.

#### [MODIFY] apps/api/src/hse/vendor/vendor.module.ts

- Import `MinioModule` (Hanya perlu jika tidak di-set `@Global` pada `minio.module.ts` sebelumnya).

## Open Questions

> [!IMPORTANT]
>
> 1. Di Prisma Schema, string file diset sebagai `String?`. Apakah Anda lebih prefer saya menyimpan full public URL `http://localhost:9000/safeflow-assets/...` utuh di dalamnya, atau URL terpisah (prefix dari frontend)? Karena default saya akan menyimpan string url secata penuh.

## Verification Plan

### Automated Tests

- Menjalankan `bun run build` di dalam workspace API untuk memastikan tidak ada _error_ kompilasi (Type error terkait Prisma, Service, atau DTO).

### Manual Verification

- Menjalankan backend NestJS secara _local_ (`bun run dev`).
- Menguji API `POST /vendor` dan menyertakan data _form-data_ menggunakan Postman (file di `logo` form-data dan data DTO lainnya).
- Melakukan verifikasi apakah folder `logo` di MinIO Dashboard (`localhost:9000`) berhasil terbuat dan isi file terbaca dengan baik.
- Memanggil API `GET /vendor` untuk memvalidasi property `vendorLogo` sudah menghasilkan string URL gambar sesuai struktur.
