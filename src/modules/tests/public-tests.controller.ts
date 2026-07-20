import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TestsService } from './services/tests.service';

@ApiTags('public-tests')
@Controller(['public/tests', 'api/public/tests'])
export class PublicTestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPublicTests() {
    return this.testsService.getPublicTests();
  }
}
