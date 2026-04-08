export interface InvitationEmailContext {
  recipientEmail: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  note?: string;
  registerUrl: string; // link ke halaman register dengan token
  expiresAt: string; // formatted date
  appName: string;
}

export function invitationEmailTemplate(ctx: InvitationEmailContext): string {
  const roleLabel: Record<string, string> = {
    ADMIN: '👑 Admin',
    MODERATOR: '🛡️ Moderator',
    USER: '👤 User',
  };

  const roleColor: Record<string, string> = {
    ADMIN: '#DC2626',
    MODERATOR: '#7C3AED',
    USER: '#2563EB',
  };

  const roleBg: Record<string, string> = {
    ADMIN: '#FEF2F2',
    MODERATOR: '#F5F3FF',
    USER: '#EFF6FF',
  };

  const label = roleLabel[ctx.role] ?? ctx.role;
  const color = roleColor[ctx.role] ?? '#2563EB';
  const bg = roleBg[ctx.role] ?? '#EFF6FF';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Undangan Bergabung — ${ctx.appName}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:48px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:16px;overflow:hidden;
                  box-shadow:0 8px 32px rgba(0,0,0,0.10);max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0F172A 0%,#1E3A5F 100%);
                    padding:40px 48px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.1);
                      border-radius:50%;width:72px;height:72px;line-height:72px;
                      font-size:36px;margin-bottom:16px;">✉️</div>
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;
                      letter-spacing:-0.5px;">Kamu Diundang!</h1>
          <p style="margin:10px 0 0;color:#94A3B8;font-size:15px;">
            Bergabung dengan <strong style="color:#E2E8F0;">${ctx.appName}</strong>
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:40px 48px;">

          <p style="margin:0 0 20px;color:#475569;font-size:16px;line-height:1.6;">
            Halo! <strong style="color:#0F172A;">${ctx.inviterName}</strong>
            mengundang kamu untuk bergabung sebagai:
          </p>

          <!-- Role Badge -->
          <div style="text-align:center;margin:0 0 28px;">
            <span style="display:inline-block;padding:10px 28px;border-radius:100px;
                          font-size:15px;font-weight:700;letter-spacing:0.3px;
                          color:${color};background:${bg};border:1.5px solid ${color}20;">
              ${label}
            </span>
          </div>

          ${
            ctx.note
              ? `
          <!-- Note from inviter -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#F8FAFC;border-left:4px solid #3B82F6;
                        border-radius:0 8px 8px 0;margin-bottom:28px;">
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0 0 4px;color:#64748B;font-size:12px;
                            font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                  Pesan dari ${ctx.inviterName}
                </p>
                <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;
                            font-style:italic;">"${ctx.note}"</p>
              </td>
            </tr>
          </table>
          `
              : ''
          }

          <!-- Steps -->
          <p style="margin:0 0 16px;color:#0F172A;font-size:15px;font-weight:600;">
            Cara bergabung:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[
              'Klik tombol di bawah ini',
              'Isi data diri kamu di halaman registrasi',
              'Akun kamu langsung aktif setelah selesai',
            ]
              .map(
                (step, i) => `
            <tr>
              <td style="padding:8px 0;vertical-align:top;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:32px;">
                      <span style="display:inline-block;width:24px;height:24px;
                                    border-radius:50%;background:#EFF6FF;
                                    color:#2563EB;font-size:12px;font-weight:700;
                                    text-align:center;line-height:24px;">
                        ${i + 1}
                      </span>
                    </td>
                    <td style="padding-left:8px;color:#475569;font-size:14px;
                                line-height:1.5;">${step}</td>
                  </tr>
                </table>
              </td>
            </tr>`,
              )
              .join('')}
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <a href="${ctx.registerUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1D4ED8);
                          color:#fff;text-decoration:none;padding:16px 40px;
                          border-radius:10px;font-size:16px;font-weight:700;
                          letter-spacing:0.2px;box-shadow:0 4px 16px rgba(37,99,235,0.35);">
                  Terima Undangan & Daftar →
                </a>
              </td>
            </tr>
          </table>

          <!-- Expiry Warning -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#FFFBEB;border:1px solid #FDE68A;
                        border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
                  ⏰ <strong>Link berlaku hingga ${ctx.expiresAt}.</strong>
                  Setelah itu link tidak bisa digunakan lagi.
                </p>
              </td>
            </tr>
          </table>

          <!-- Fallback link -->
          <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">
            Jika tombol tidak berfungsi, salin link berikut ke browser:<br/>
            <a href="${ctx.registerUrl}"
               style="color:#2563EB;word-break:break-all;">${ctx.registerUrl}</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;
                    padding:20px 48px;text-align:center;">
          <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.6;">
            Email ini dikirim karena <strong>${ctx.inviterEmail}</strong> mengundang
            <strong>${ctx.recipientEmail}</strong> ke ${ctx.appName}.<br/>
            Jika ini bukan kamu, abaikan email ini.
          </p>
          <p style="margin:8px 0 0;color:#CBD5E1;font-size:11px;">
            © ${new Date().getFullYear()} ${ctx.appName}
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
  `.trim();
}
