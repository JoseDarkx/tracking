import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auto.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===============================
  // 🔐 LOGIN
  // ===============================
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // ===============================
  // 📝 REGISTER
  // ===============================
  @Post('register')
  async register(
    @Body('nombre') nombre: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.register(nombre, email, password);
  }

  // ===============================
  // 👤 PERFIL (Ruta protegida)
  // ===============================
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}