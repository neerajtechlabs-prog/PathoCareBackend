import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantService {
  // TODO: Full implementation in Week 2
  getTenantInfo(slug: string): { slug: string; status: string } {
    return {
      slug,
      status: 'active',
    };
  }
}
