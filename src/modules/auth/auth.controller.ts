import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {

  @Post('login')
  @ApiOperation({ summary: 'User login - TODO: Full implementation in Week 3' })
  login(): { message: string } {
    return { message: 'Login endpoint - TODO: Implementation in Week 3' };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT token' })
  refresh(): { message: string } {
    return { message: 'Refresh endpoint - TODO: Implementation in Week 3' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  logout(): { message: string } {
    return { message: 'Logout endpoint - TODO: Implementation in Week 3' };
  }
}
