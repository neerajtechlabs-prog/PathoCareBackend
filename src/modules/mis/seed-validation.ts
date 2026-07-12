import { MisService } from './mis.service';
import { TenantDataSourceService } from '../../database/datasources/tenant.datasource';

export async function runMisSeedValidation(tenantSlug: string, date: string) {
  const tenantDSService = new TenantDataSourceService({
    get: (key: string) => process.env[key],
  } as any);

  const misService = new MisService(tenantDSService);
  const summary = await misService.getDayCollection(tenantSlug, date);
  const register = await misService.getDayRegister(tenantSlug, date);

  return { summary, register };
}
