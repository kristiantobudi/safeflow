# Migrasi Database: MongoDB → PostgreSQL (Safeflow)

## Latar Belakang

Safeflow saat ini menggunakan **MongoDB** sebagai database utama (via Prisma ORM) dengan konfigurasi:

- `DATABASE_URL=mongodb://localhost:27017/master-hse`
- `MONGODB_URI=mongodb://localhost:27017/master-hse`
- Session store menggunakan `connect-mongo`
- `mongoose` masih diimport di `database.module.ts`

Tujuan migrasi: beralih ke **PostgreSQL** + menghapus semua dependensi MongoDB, lalu membuat seed data + E2E test yang berjalan di atas PostgreSQL.

---

## User Review Required

> [!IMPORTANT]
> **Embedded Type `RiskAssessment` (MongoDB-only)**: Schema Prisma saat ini menggunakan `type RiskAssessment` (embedded document, hanya ada di MongoDB). Di PostgreSQL, ini harus diubah menjadi **kolom-kolom terpisah** langsung di tabel `Hirac`. Contoh: `penilaianAwalAkibat`, `penilaianAwalKemungkinan`, `penilaianAwalTingkatRisiko`, dst.

> [!WARNING]
> **Data Existing**: Jika ada data di MongoDB yang perlu dimigrasikan, pipeline migrasi data perlu dibuat terpisah. Plan ini **tidak** mencakup migrasi data lama — hanya migrasi schema dan kode.

> [!CAUTION]
> **Session Store**: `connect-mongo` digunakan untuk session. Di PostgreSQL, akan diganti pakai **`connect-pg-simple`** (session store berbasis PostgreSQL).

---

## Proposed Changes

### 1. Database Package (`packages/database`)

#### [MODIFY] [schema.prisma](file:///c:/Users/HP/Desktop/safeflow/packages/database/prisma/schema.prisma)

Perubahan utama:

- Ubah `datasource db` dari `mongodb` → `postgresql`
- Hapus semua `@db.ObjectId` dan `@map("_id")`
- Ubah semua `String @id @default(auto())` → `String @id @default(cuid())`
- Hapus embedded type `RiskAssessment` — flatten field-field-nya ke model `Hirac`
- Hapus `String[]` di `twoFactorBackupCodes` dan `options` → ganti dengan relasi tabel terpisah atau `Json`
- Hapus `Role[]` di `Notification.visibleTo` → ganti dengan `Json` atau tabel pivot
- Field `questionIds String[]` di `ExamAttempt` → ganti dengan `Json`

Schema baru (rangkuman per model):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id String @id @default(cuid())
  // ... semua field sama kecuali:
  twoFactorBackupCodes Json     @default("[]")  // ganti dari String[]
  // hapus @db.ObjectId dari semua FK
}

model Hirac {
  // ganti embedded RiskAssessment menjadi kolom flat:
  penilaianAwalAkibat            Int
  penilaianAwalKemungkinan       String
  penilaianAwalTingkatRisiko     RiskLevel
  penilaianLanjutanAkibat        Int
  penilaianLanjutanKemungkinan   String
  penilaianLanjutanTingkatRisiko RiskLevel
}

model ExamAttempt {
  questionIds Json @default("[]")  // ganti dari String[]
}

model Question {
  options Json  // ganti dari String[]
}

model Notification {
  visibleTo Json @default("[\"ADMIN\"]")  // ganti dari Role[]
}
```

#### [MODIFY] [package.json](file:///c:/Users/HP/Desktop/safeflow/packages/database/package.json)

- Downgrade/tetap di `@prisma/client ^5.22.0` dan `prisma ^5.22.0` (sudah kompatibel dengan PostgreSQL)
- Tambahkan script `db:seed`

#### [NEW] `packages/database/src/seed.ts`

Seed data untuk:

- 4 User: 1 ADMIN, 1 VERIFICATOR, 1 EXAMINER, 1 USER biasa
- 1 Module dengan 1 ModuleFile
- 1 Exam dengan 5 Question
- 1 Project dengan 2 Hirac
- 2 ProjectApproval step

#### [MODIFY] [scripts/setup-db.ts](file:///c:/Users/HP/Desktop/safeflow/packages/database/scripts/setup-db.ts)

- Hapus `$runCommandRaw` (MongoDB-only)
- Untuk PostgreSQL, TTL/cleanup audit log ditangani via cron job di API (sudah ada)

---

### 2. API App (`apps/api`)

#### [MODIFY] [database.module.ts](file:///c:/Users/HP/Desktop/safeflow/apps/api/src/database/database.module.ts)

- **Hapus seluruh provider `MONGODB_CONNECTION`** (mongoose)
- Hanya menyediakan `PrismaService`
- Hapus import `mongoose`

```typescript
@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

#### [MODIFY] [prisma.service.ts](file:///c:/Users/HP/Desktop/safeflow/apps/api/src/database/prisma.service.ts)

- Update log message dari `'Prisma connected to MongoDB'` → `'Prisma connected to PostgreSQL'`

#### [MODIFY] [main.ts](file:///c:/Users/HP/Desktop/safeflow/apps/api/src/main.ts)

- Hapus import `MongoStore from 'connect-mongo'`
- Ganti session store dengan `connect-pg-simple`:

```typescript
import pgSession from 'connect-pg-simple';
const PgStore = pgSession(session);
// ...
store: new PgStore({
  conString: configService.get<string>('DATABASE_URL'),
  tableName: 'sessions',
  ttl: sessionMaxAge / 1000,
}),
```

#### [MODIFY] [package.json](file:///c:/Users/HP/Desktop/safeflow/apps/api/package.json)

Dependensi yang perlu dihapus:

- `connect-mongo`
- `mongoose`

Dependensi yang perlu ditambahkan:

- `connect-pg-simple`
- `@types/connect-pg-simple`

---

### 3. Environment Variables (`.env`)

#### [MODIFY] [.env](file:///c:/Users/HP/Desktop/safeflow/.env)

```bash
# Database - PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/safeflow

# Hapus:
# MONGODB_URI=...
# (line DATABASE_URL lama diganti)
```

---

### 4. Docker Compose (`docker-compose.yml`)

#### [MODIFY] [docker-compose.yml](file:///c:/Users/HP/Desktop/safeflow/docker-compose.yml)

- Hapus referensi `MONGODB_URI`
- Tambahkan service `postgres`:

```yaml
postgres:
  image: postgres:16-alpine
  container_name: safeflow-postgres
  restart: always
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: safeflow
  ports:
    - '5432:5432'
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - safeflow-network
```

---

### 5. Test Setup (`apps/api/test/setup.ts`)

#### [MODIFY] [setup.ts](file:///c:/Users/HP/Desktop/safeflow/apps/api/test/setup.ts)

- Update komentar dari `MongoDB` → `PostgreSQL`
- Untuk `cleanDatabase`, urutan delete sudah benar (child-first). Tidak ada perubahan logika, hanya pastikan transaction PostgreSQL berjalan

---

### 6. File yang Perlu Diperiksa (Mungkin Ada Referensi MongoDB)

Berikut file-file yang kemungkinan besar masih referensi MongoDB dan harus dicek:

| File                                | Isu Potensial                               |
| ----------------------------------- | ------------------------------------------- |
| `apps/api/src/auth/auth.service.ts` | Mungkin ada raw query MongoDB               |
| `apps/api/src/hse/hirac/*.ts`       | Menggunakan field `RiskAssessment` embedded |
| `apps/api/src/hse/projects/*.ts`    | Mungkin ada raw MongoDB aggregation         |
| `apps/api/src/audit-log/*.ts`       | TTL index MongoDB-specific                  |
| `apps/api/src/common/redis/*.ts`    | Tidak berubah (Redis tetap)                 |

---

## Checklist Urutan Pengerjaan

```
[ ] 1. Update schema.prisma (provider + model changes)
[ ] 2. Update .env (ganti DATABASE_URL ke PostgreSQL)
[ ] 3. Update docker-compose.yml (tambah postgres service)
[ ] 4. Hapus MONGODB_CONNECTION dari database.module.ts
[ ] 5. Update main.ts (connect-mongo → connect-pg-simple)
[ ] 6. Update package.json API (hapus mongoose/connect-mongo, tambah connect-pg-simple)
[ ] 7. Periksa dan perbaiki service yang menggunakan field RiskAssessment (Hirac)
[ ] 8. Jalankan: prisma migrate dev --name init
[ ] 9. Buat seed.ts dan jalankan: bun run db:seed
[ ] 10. Perbaiki test setup dan jalankan E2E tests
```

---

## Verification Plan

### Database Migration

```bash
cd packages/database
bun prisma migrate dev --name init-postgresql
bun run db:seed
```

### Build Check

```bash
cd apps/api
bun run build
```

### E2E Tests

```bash
cd apps/api
bun run test:e2e
```

### Manual Verification

1. Start PostgreSQL (docker-compose up postgres redis)
2. Start API: `bun run dev` di `apps/api`
3. Test hit endpoint `/api/v1/auth/register` via Postman/curl
4. Cek data masuk via Prisma Studio: `bun run studio` di `packages/database`
