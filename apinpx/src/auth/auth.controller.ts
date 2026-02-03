import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔐 Login
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // 👤 Registro
  @Post('register')
  async register(
    @Body('nombre') nombre: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('role') role?: string,
  ) {
    return this.authService.register(nombre, email, password, role);
  }

  // 📊 Obtener perfil del usuario actual
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  // 🔍 Verificar token
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Request() req) {
    return {
      ok: true,
      user: req.user,
    };
  }
}