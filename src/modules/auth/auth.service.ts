import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // TODO: Full implementation in Week 3
  generateAccessToken(payload: Record<string, unknown>): string {
    return this.jwtService.sign(payload);
  }

  validateToken(token: string): Record<string, unknown> {
    return this.jwtService.verify(token);
  }
}
