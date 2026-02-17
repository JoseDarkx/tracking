import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔐 LOGIN
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // 👤 CREAR USUARIO (SOLO ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/create-user')
  async adminCreateUser(
    @Body('nombre') nombre: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('role') role: 'admin' | 'employee',
  ) {
    return this.authService.register(nombre, email, password, role);
  }

  // Agrega estas rutas dentro de la clase AuthController

  // 📊 LISTAR TODOS LOS USUARIOS (SOLO ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users')
  async findAllUsers() {
    return this.authService.findAll();
  }

  // 🗑️ ELIMINAR USUARIO (SOLO ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/delete-user/:id') // Usamos Post o Delete según prefieras
  async deleteUser(@Param('id') id: string) {
    return this.authService.remove(id);
  }

  // 🔑 CAMBIAR PASSWORD (SOLO ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/change-password')
  async adminChangePassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.adminChangePasswordByEmail(
      email,
      newPassword,
    );
}

  // 📊 PERFIL
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  // 🔍 VERIFY TOKEN
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Request() req) {
    return {
      ok: true,
      user: req.user,
    };
  }
}
