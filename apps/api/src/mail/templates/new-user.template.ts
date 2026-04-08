export interface NewUserEmailContext {
  adminName: string;
  newUserEmail: string;
  newUserUsername: string;
  newUserDisplayName?: string;
  provider: 'LOCAL' | 'GOOGLE';
  registeredAt: string;
  dashboardUrl: string;
}

export function newUserEmailTemplate(ctx: NewUserEmailContext): string {
  const providerLabel =
    ctx.provider === 'GOOGLE'
      ? '🔗 Google SSO'
      : '📧 Email & Password';

  const providerColor = ctx.provider === 'GOOGLE' ? '#4285F4' : '#10B981';
  const providerBg = ctx.provider === 'GOOGLE' ? '#EBF5FB' : '#ECFDF5';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pengguna Baru Terdaftar</title>
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
                🔔 Notifikasi Admin
              </h1>
              <p style="margin:8px 0 0;color:#94A3B8;font-size:14px;">
                ${process.env.APP_NAME || 'NestJS App'}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;color:#6B7280;font-size:14px;">
                Halo, <strong style="color:#1E293B;">${ctx.adminName}</strong>
              </p>
              <h2 style="margin:0 0 24px;color:#1E293B;font-size:20px;font-weight:700;">
                👤 Pengguna Baru Baru Saja Mendaftar
              </h2>

              <!-- User Card -->
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
                            ${ctx.newUserEmail}
                          </strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">Username</span>
                          <strong style="color:#1E293B;font-size:15px;">
                            @${ctx.newUserUsername}
                          </strong>
                        </td>
                      </tr>
                      ${ctx.newUserDisplayName ? `
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">Nama</span>
                          <strong style="color:#1E293B;font-size:15px;">
                            ${ctx.newUserDisplayName}
                          </strong>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">
                            Metode Daftar
                          </span>
                          <span style="display:inline-block;margin-top:4px;
                                       padding:4px 12px;border-radius:20px;
                                       font-size:13px;font-weight:600;
                                       color:${providerColor};
                                       background:${providerBg};">
                            ${providerLabel}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#6B7280;font-size:13px;display:block;">
                            Waktu Daftar
                          </span>
                          <strong style="color:#1E293B;font-size:15px;">
                            ${ctx.registeredAt}
                          </strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${ctx.dashboardUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#2563EB);
                              color:#ffffff;text-decoration:none;padding:14px 32px;
                              border-radius:8px;font-size:15px;font-weight:600;
                              letter-spacing:0.2px;">
                      Lihat di Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                Email ini dikirim otomatis karena kamu terdaftar sebagai Admin di
                <strong>${process.env.APP_NAME || 'NestJS App'}</strong>.
                Kamu tidak perlu membalas email ini.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;
                        padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                © ${new Date().getFullYear()} ${process.env.APP_NAME || 'NestJS App'}.
                Semua hak dilindungi.
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
