# Rencana Implementasi: Integrasi NestJS API dengan Packages Database

## Pendahuluan

Dokumen ini disusun sebagai **panduan (blueprint) untuk AI Agent** yang akan mengeksekusi integrasi antara service backend NestJS (`apps/api`) dengan modul database yang ada pada monorepo (`packages/database`). Struktur backend menggunakan Prisma ORM dan Mongoose dengan PostgreSQL/MongoDB (terdefinisi di schema Prisma).

Modul database `DatabaseModule` dan `PrismaService` di backend sudah disiapkan, namun perlu ada beberapa penyesuaian import serta pembentukan standar agar fitur CRUD dapat dikembangkan dengan konsisten dan aman.

---

## Tahap 1: Penyesuaian PrismaService (Wajib dilakukan pertama)

Saat ini `apps/api/src/database/prisma.service.ts` memanggil `PrismaClient` bawaan default. Agent perlu mengubah arah import agar mengambil client yang telah di-generate dalam `packages/database` sehingga tipe datanya (`schema`) sinkron 100% dan tidak memicu error TypeScript.

**Tugas AI Agent:**
Buka file `apps/api/src/database/prisma.service.ts` dan ubah:

```diff
- import { PrismaClient } from '@prisma/client';
+ import { PrismaClient } from '@repo/database';
```

## Tahap 2: Standardisasi Pembuatan Modul Fitur (Feature Modules)

Setiap entitas baru yang dibuat (contoh: `Users`, `Exams`, `Modules`) harus mengikuti struktur 3-layer NestJS: **Controller -> Service -> Database**.

**Tugas AI Agent:**
Ketika diminta membuat fitur CRUD, ikuti alur berikut:

1. **Pembuatan DTO (Data Transfer Object)**
   Buat folder `dto/` di dalam modul. Gunakan `@nestjs/swagger` jika diperlukan, serta `@nestjs/class-validator` untuk memvalidasi input dari jaringan.
   _Hindari memberikan payload mentah secara langsung ke Prisma._

2. **Injeksikan PrismaService pada Service Class**
   Contoh kode wajib:

   ```typescript
   import { Injectable } from '@nestjs/common';
   import { PrismaService } from '../database/prisma.service';

   @Injectable()
   export class UserService {
     constructor(private prisma: PrismaService) {}

     async findUserById(id: string) {
       // Operasi Prisma Database disini
       return this.prisma.user.findUnique({ where: { id } });
     }
   }
   ```

3. **Routing di Controller**
   Injeksi Service ke dalam Controller. Terapkan JWT / Guards yang sesuai sebelum mengakses database.

4. **Registrasi ke Module App**
   Karena `DatabaseModule` di `apps/api/src/database/database.module.ts` sudah bersifat `@Global()`, Anda **TIDAK PERLU** lagi mengimpor `DatabaseModule` di module anak. Cukup define service dan controller.

---

## Tahap 3: Security & Data Response (Sangat Penting)

**Tugas AI Agent:**
Setiap kali mengekstrak data dari database (terutama `User`), pastikan **field rahasia (sensitif)** TIDAK bocor ke frontend.

- Selalu gunakan `select` atau `omit` pada operasi Prisma untuk menyembunyikan: `password`, `twoFactorSecret`, `invitationToken`.
- Contoh penerapan:
  ```typescript
  this.prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, role: true }, // EXPLICIT select
  });
  ```

---

## Tahap 4: Penanganan Error Prisma (Exception Filters)

**Tugas AI Agent:**
Buat sebuah global exception filter untuk menangkap error dari Prisma ORM (`Prisma.PrismaClientKnownRequestError`) agar API mengembalikan status HTTP yang benar (bukan 500 Internal Server Error saat data conflict).

- Error kode `P2002`: Ubah menjadi `HttpException` (409 Conflict) untuk error Record Duplicate (contoh: email sudah ada).
- Error kode `P2025`: Ubah menjadi `HttpException` (404 Not Found) untuk Record Not Found.

---

## Ringkasan Checklist untuk AI Agent Nanti:

- [ ] Ubah import `@prisma/client` menjadi `@repo/database` di `PrismaService`.
- [ ] Buat Exception Filter khusus untuk error Prisma.
- [ ] Buatkan modul fitur pertama (misal: `UsersModule` atau `AuthModule`) sebagai kerangka uji coba database.
- [ ] Implementasi validasi DTO dari request body sebelum dikirim ke `this.prisma`.
- [ ] Filter field sensitif sebelum mengembalikan data ke klien.
