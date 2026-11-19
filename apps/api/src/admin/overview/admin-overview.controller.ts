import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { AdminOverviewService } from './admin-overview.service.js';

@Controller('admin/overview')
@UseGuards(AdminGuard)
export class AdminOverviewController {
  constructor(private readonly overview: AdminOverviewService) {}

  @Get()
  get() {
    return this.overview.get();
  }
}
