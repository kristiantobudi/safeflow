import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@repo/database';
import { VendorCertificationService } from './vendor-certification.service';

const BYPASS_ROLES: string[] = [Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER];

/**
 * VendorCertifiedGuard
 *
 * Protects endpoints (e.g. JSA, PTW) that require the requesting vendor to
 * hold an active, non-expired VendorCertification.
 *
 * Bypass rules:
 *  - ADMIN, VERIFICATOR, EXAMINER roles are always allowed through.
 *
 * Denial rules (for USER role with a vendorId):
 *  - No ACTIVE certification found → 403
 *  - ACTIVE certification found but expiresAt < now() → 403
 *
 * Redis caching is handled transparently by VendorCertificationService
 * (getCertificationStatus), keeping guard latency low.
 */
@Injectable()
export class VendorCertifiedGuard implements CanActivate {
  constructor(
    private readonly vendorCertificationService: VendorCertificationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Non-vendor roles bypass the certification check entirely
    if (BYPASS_ROLES.includes(user?.role)) {
      return true;
    }

    // A user without a vendorId cannot satisfy the certification requirement
    if (!user?.vendorId) {
      throw new ForbiddenException(
        'Akun tidak terhubung ke vendor. Hubungi administrator.',
      );
    }

    // Delegate to the service which reads from Redis cache (TTL 5 min)
    const status = await this.vendorCertificationService.getCertificationStatus(
      user.vendorId,
    ) as { vendorId: string; isCertified: boolean; certification: { expiresAt?: Date | string | null } | null };

    if (!status.isCertified || !status.certification) {
      throw new ForbiddenException(
        'Vendor belum tersertifikasi. Selesaikan semua modul training yang dipersyaratkan.',
      );
    }

    // Enforce expiry in real-time (cache TTL is short, but we still check)
    const { expiresAt } = status.certification;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      throw new ForbiddenException(
        'Sertifikasi vendor sudah kedaluwarsa. Hubungi admin untuk pembaruan.',
      );
    }

    return true;
  }
}
