export interface BulkRegisterEmailContext {
  firstName: string;
  email: string;
  username: string;
  plainPassword?: string;
  loginUrl: string;
  appName: string;
}

export function bulkRegisterEmailTemplate(ctx: BulkRegisterEmailContext): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Akun Baru Berhasil Dibuat</title>
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
            <td style="background:linear-gradient(135deg,#3B82F6 0%,#2563EB 100%);
                        padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                          letter-spacing:-0.5px;">
                🎉 Selamat Datang di ${ctx.appName}!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#6B7280;font-size:15px;line-height:1.6;">
                Halo <strong style="color:#1E293B;">${ctx.firstName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
                Akun Anda telah berhasil didaftarkan oleh Administrator sistem.
                Berikut adalah detail kredensial Anda untuk masuk ke sistem:
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F8FAFC;border:1px solid #E2E8F0;
                            border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">Email</span>
                          <strong style="color:#1E293B;font-size:15px;">
                            ${ctx.email}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">Username</span>
                          <strong style="color:#1E293B;font-size:15px;">
                            ${ctx.username}
                          </strong>
                        </td>
                      </tr>
                      ${ctx.plainPassword ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">Temporary Password</span>
                          <strong style="color:#1E293B;font-size:15px;background:#E2E8F0;padding:2px 6px;border-radius:4px;font-family:monospace;">
                            ${ctx.plainPassword}
                          </strong>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#D97706;font-size:14px;line-height:1.6;background:#FEF3C7;padding:12px;border-radius:8px;border-left:4px solid #F59E0B;">
                <strong>Penting:</strong> Harap segera ubah password Anda setelah berhasil masuk untuk menjaga keamanan akun Anda.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <a href="${ctx.loginUrl}"
                       style="display:inline-block;background:#3B82F6;
                              color:#ffffff;text-decoration:none;padding:14px 32px;
                              border-radius:8px;font-size:15px;font-weight:600;">
                      Masuk Sekarang
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
