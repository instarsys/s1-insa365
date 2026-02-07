import type { IUserRepository } from '../../ports/IUserRepository';
import type { LoginDto, TokenResponseDto } from '../../dtos/auth';
import type { ICompanyRepository } from '../../ports/ICompanyRepository';
import { ValidationError } from '@domain/errors';

export interface IPasswordService {
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface ITokenService {
  generateAccessToken(payload: { userId: string; companyId: string; role: string }): string;
  generateRefreshToken(payload: { userId: string }): string;
}

export class LoginUseCase {
  constructor(
    private userRepo: IUserRepository,
    private companyRepo: ICompanyRepository,
    private passwordService: IPasswordService,
    private tokenService: ITokenService,
  ) {}

  async execute(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    const isValid = await this.passwordService.compare(dto.password, user.password);
    if (!isValid) {
      throw new ValidationError('Invalid email or password');
    }

    if (user.employeeStatus === 'RESIGNED' || user.employeeStatus === 'TERMINATED') {
      throw new ValidationError('Account is inactive');
    }

    const company = await this.companyRepo.findById(user.companyId);
    if (!company) {
      throw new ValidationError('Company not found');
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });

    const refreshToken = this.tokenService.generateRefreshToken({
      userId: user.id,
    });

    await this.userRepo.updateRefreshToken(user.companyId, user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
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
