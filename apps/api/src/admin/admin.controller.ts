import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  adminSetPasswordSchema,
  type AdminSetPasswordInput,
} from '@geld-flow/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/password')
  async setUserPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminSetPasswordSchema))
    body: AdminSetPasswordInput,
  ) {
    await this.adminService.setUserPassword(id, body.newPassword);
    return { message: 'Password updated.' };
  }
}
