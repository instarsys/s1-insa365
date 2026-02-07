import type { IUserRepository } from '../../ports/IUserRepository';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import type { TokenResponseDto } from '../../dtos/auth';
import type { ITokenService } from './LoginUseCase';
import { ValidationError } from '@domain/errors';

export interface IRefreshTokenValidator {
  verify(token: string): { userId: string } | null;
}

export class RefreshTokenUseCase {
  constructor(
    private userRepo: IUserRepository,
    private companyRepo: ICompanyRepository,
    private tokenValidator: IRefreshTokenValidator,
    private tokenService: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<TokenResponseDto> {
    const payload = this.tokenValidator.verify(refreshToken);
    if (!payload) {
      throw new ValidationError('Invalid refresh token');
    }

    const user = await this.userRepo.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new ValidationError('Invalid refresh token');
    }

    if (user.employeeStatus === 'RESIGNED' || user.employeeStatus === 'TERMINATED') {
      throw new ValidationError('Account is inactive');
    }

    const company = await this.companyRepo.findById(user.companyId);
    if (!company) {
      throw new ValidationError('Company not found');
    }

    const newAccessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const newRefreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
    });

    await this.userRepo.updateRefreshToken(user.companyId, user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: company.name,
      },
    };
  }
}
