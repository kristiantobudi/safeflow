import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import * as fc from 'fast-check';
import { Role } from '@repo/database';
import { VendorCertifiedGuard } from './vendor-certified.guard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal NestJS ExecutionContext mock that returns the given user
 * from the HTTP request.
 */
function makeContext(user: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * Build a mock VendorCertificationService.
 * By default getCertificationStatus returns a certified, non-expired status.
 */
function makeService(overrides: Partial<{
  isCertified: boolean;
  expiresAt: Date | null;
}> = {}) {
  const { isCertified = true, expiresAt = null } = overrides;

  const certification = isCertified
    ? { id: 'cert-1', status: 'ACTIVE', expiresAt }
    : null;

  return {
    getCertificationStatus: jest.fn().mockResolvedValue({
      vendorId: 'vendor-1',
      isCertified,
      certification,
    }),
  };
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('VendorCertifiedGuard', () => {
  describe('canActivate — unit tests', () => {
    it('should return true for ADMIN role without checking certification', async () => {
      const service = makeService({ isCertified: false });
      const guard = new VendorCertifiedGuard(service as any);

      const result = await guard.canActivate(
        makeContext({ role: Role.ADMIN, vendorId: null }),
      );

      expect(result).toBe(true);
      expect(service.getCertificationStatus).not.toHaveBeenCalled();
    });

    it('should return true for VERIFICATOR role without checking certification', async () => {
      const service = makeService({ isCertified: false });
      const guard = new VendorCertifiedGuard(service as any);

      const result = await guard.canActivate(
        makeContext({ role: Role.VERIFICATOR, vendorId: null }),
      );

      expect(result).toBe(true);
      expect(service.getCertificationStatus).not.toHaveBeenCalled();
    });

    it('should return true for EXAMINER role without checking certification', async () => {
      const service = makeService({ isCertified: false });
      const guard = new VendorCertifiedGuard(service as any);

      const result = await guard.canActivate(
        makeContext({ role: Role.EXAMINER, vendorId: null }),
      );

      expect(result).toBe(true);
      expect(service.getCertificationStatus).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when USER has no vendorId', async () => {
      const service = makeService();
      const guard = new VendorCertifiedGuard(service as any);

      await expect(
        guard.canActivate(makeContext({ role: Role.USER, vendorId: null })),
      ).rejects.toThrow(ForbiddenException);

      expect(service.getCertificationStatus).not.toHaveBeenCalled();
    });

    it('should return true for USER with an active, non-expired certification', async () => {
      const service = makeService({ isCertified: true, expiresAt: null });
      const guard = new VendorCertifiedGuard(service as any);

      const result = await guard.canActivate(
        makeContext({ role: Role.USER, vendorId: 'vendor-1' }),
      );

      expect(result).toBe(true);
      expect(service.getCertificationStatus).toHaveBeenCalledWith('vendor-1');
    });

    it('should throw ForbiddenException for USER with no active certification', async () => {
      const service = makeService({ isCertified: false });
      const guard = new VendorCertifiedGuard(service as any);

      await expect(
        guard.canActivate(makeContext({ role: Role.USER, vendorId: 'vendor-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for USER with an expired certification', async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const service = makeService({ isCertified: true, expiresAt: pastDate });
      const guard = new VendorCertifiedGuard(service as any);

      await expect(
        guard.canActivate(makeContext({ role: Role.USER, vendorId: 'vendor-1' })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return true for USER with a certification that expires in the future', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const service = makeService({ isCertified: true, expiresAt: futureDate });
      const guard = new VendorCertifiedGuard(service as any);

      const result = await guard.canActivate(
        makeContext({ role: Role.USER, vendorId: 'vendor-1' }),
      );

      expect(result).toBe(true);
    });
  });

  // ─── Property-based test: Access Invariant ──────────────────────────────
  //
  // **Validates: Requirements A.1**
  //
  // Property 3: Access Invariant
  // For any user with role ADMIN, VERIFICATOR, or EXAMINER, the guard MUST
  // always return true without ever consulting the certification service,
  // regardless of the userId, vendorId, or any other user attribute.
  //
  // Formally: ∀ user where user.role ∈ {ADMIN, VERIFICATOR, EXAMINER}
  //           ⟹ canActivate(user) = true ∧ getCertificationStatus not called

  describe('canActivate — Property 3: Access Invariant', () => {
    it('should always return true for bypass roles without calling getCertificationStatus', async () => {
      const bypassRoles = [Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER];

      await fc.assert(
        fc.asyncProperty(
          // Arbitrary role from the bypass set
          fc.constantFrom(...bypassRoles),
          // Arbitrary userId (any string, including edge cases)
          fc.string({ minLength: 0, maxLength: 64 }),
          // Arbitrary vendorId — may or may not be present
          fc.option(fc.string({ minLength: 1, maxLength: 36 }), { nil: null }),
          async (role, userId, vendorId) => {
            // Service is configured to return NOT certified — if the guard
            // ever calls it for a bypass role, the test would still pass
            // but we assert it is NOT called at all.
            const service = makeService({ isCertified: false });
            const guard = new VendorCertifiedGuard(service as any);

            const result = await guard.canActivate(
              makeContext({ role, id: userId, vendorId }),
            );

            // Guard must return true for all bypass roles
            expect(result).toBe(true);

            // Guard must NOT consult the certification service for bypass roles
            expect(service.getCertificationStatus).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should never throw for bypass roles regardless of vendorId or certification state', async () => {
      const bypassRoles = [Role.ADMIN, Role.VERIFICATOR, Role.EXAMINER];

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...bypassRoles),
          fc.string({ minLength: 0, maxLength: 64 }),
          fc.option(fc.string({ minLength: 1, maxLength: 36 }), { nil: null }),
          async (role, userId, vendorId) => {
            // Even with a service that would throw if called, bypass roles
            // must never trigger an exception.
            const service = {
              getCertificationStatus: jest.fn().mockRejectedValue(
                new Error('Should not be called'),
              ),
            };
            const guard = new VendorCertifiedGuard(service as any);

            await expect(
              guard.canActivate(makeContext({ role, id: userId, vendorId })),
            ).resolves.toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should always allow access for USER with a valid active certification (no expiry)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Arbitrary vendorId
          fc.string({ minLength: 1, maxLength: 36 }),
          async (vendorId) => {
            const service = makeService({ isCertified: true, expiresAt: null });
            const guard = new VendorCertifiedGuard(service as any);

            const result = await guard.canActivate(
              makeContext({ role: Role.USER, vendorId }),
            );

            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should always deny access for USER with no active certification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 36 }),
          async (vendorId) => {
            const service = makeService({ isCertified: false });
            const guard = new VendorCertifiedGuard(service as any);

            await expect(
              guard.canActivate(makeContext({ role: Role.USER, vendorId })),
            ).rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
