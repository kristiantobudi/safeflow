export interface BulkRegisterAdminContext {
  adminName: string;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  skippedDetails: Array<{ email?: string; username?: string; reason: string }>;
  appName: string;
  dashboardUrl: string;
}

export function bulkRegisterAdminTemplate(ctx: BulkRegisterAdminContext): string {
  const skippedRowsHtml = ctx.skippedDetails.length > 0 
    ? `
      <table width="100%" cellpadding="10" cellspacing="0" style="border-collapse: collapse; margin-top: 16px; font-size: 13px;">
        <thead>
          <tr style="background-color: #F1F5F9; text-align: left;">
            <th style="border: 1px solid #E2E8F0; color: #475569;">Identifier</th>
            <th style="border: 1px solid #E2E8F0; color: #475569;">Alasan Gagal</th>
          </tr>
        </thead>
        <tbody>
          ${ctx.skippedDetails.map(detail => `
            <tr>
              <td style="border: 1px solid #E2E8F0; color: #1E293B;">${detail.email || detail.username || 'Unknown'}</td>
              <td style="border: 1px solid #E2E8F0; color: #EF4444;">${detail.reason}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<p style="color: #10B981; font-size: 14px;">Semua data berhasil diproses tanpa ada yang gagal.</p>';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan Pendaftaran Massal</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E293B 0%,#334155 100%);
                        padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                          letter-spacing:-0.5px;">
                📊 Laporan Pendaftaran Massal
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#6B7280;font-size:15px;line-height:1.6;">
                Halo <strong style="color:#1E293B;">${ctx.adminName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                Proses pendaftaran massal (Bulk Register) pengguna melalui file Excel telah selesai dijalankan. Berikut adalah ringkasan hasilnya:
              </p>

              <!-- Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F8FAFC;border:1px solid #E2E8F0;
                            border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center;">
                      <tr>
                        <!-- Total Processed -->
                        <td style="width: 33%; padding: 10px;">
                          <span style="display:block; font-size:24px; font-weight:700; color:#3B82F6;">${ctx.totalProcessed}</span>
                          <span style="display:block; font-size:13px; color:#64748B; margin-top:4px;">Total Diproses</span>
                        </td>
                        <!-- Total Success -->
                        <td style="width: 33%; padding: 10px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
                          <span style="display:block; font-size:24px; font-weight:700; color:#10B981;">${ctx.totalSuccess}</span>
                          <span style="display:block; font-size:13px; color:#64748B; margin-top:4px;">Berhasil</span>
                        </td>
                        <!-- Total Failed -->
                        <td style="width: 33%; padding: 10px;">
                          <span style="display:block; font-size:24px; font-weight:700; color:#EF4444;">${ctx.totalFailed}</span>
                          <span style="display:block; font-size:13px; color:#64748B; margin-top:4px;">Gagal/Dilewati</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h2 style="margin:0 0 12px;color:#1E293B;font-size:18px;font-weight:600;">Detail Data Gagal</h2>
              ${skippedRowsHtml}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <a href="${ctx.dashboardUrl}"
                       style="display:inline-block;background:#1E293B;
                              color:#ffffff;text-decoration:none;padding:12px 28px;
                              border-radius:8px;font-size:14px;font-weight:600;">
                      Lihat Daftar Pengguna
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} ${ctx.appName}. Semua hak dilindungi.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
