import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TestsService } from './services/tests.service';

@ApiTags('public-tests')
@Controller(['public/tests', 'api/public/tests'])
export class PublicTestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get()
  async getPublicTests(): Promise<any> {
    return this.testsService.getPublicTests();
  }

  @Get('search')
  async searchPublicTests(@Query('q') query?: string): Promise<any> {
    return this.testsService.findPublicTests(query);
  }
}
