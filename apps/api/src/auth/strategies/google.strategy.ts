import { Injectable, BadRequestException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
      // Prompt consent setiap kali (opsional — hapus jika tidak mau re-prompt)
      // prompt: 'select_account',
    });
  }

  /**
   * Dipanggil otomatis oleh Passport setelah Google redirect balik ke callback URL.
   * Profile berisi data dari Google: id, email, nama, foto, dll.
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, photos, displayName, name } = profile;

    const email = emails?.[0]?.value;
    if (!email) {
      return done(
        new BadRequestException('Google account must have an email'),
        undefined,
      );
    }

    const googleUser = {
      googleId: id,
      email: email,
      displayName:
        displayName || `${name?.givenName} ${name?.familyName}`.trim(),
      avatarUrl: photos?.[0]?.value || null,
      isEmailVerified: emails?.[0]?.verified === true,
    };

    try {
      // Cari atau buat user berdasarkan data Google
      const user = await this.authService.findOrCreateGoogleUser(googleUser);
      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }
}
