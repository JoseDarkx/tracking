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
import {
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * Controlador para la gestión de autenticación y perfiles de usuario.
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Inicia sesión de un usuario validando sus credenciales.
   * @param req Solicitud con el usuario validado por LocalAuthGuard.
   * @returns Token de acceso y datos del usuario.
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  /**
   * Registra un nuevo usuario en el sistema (solo para administradores).
   * @param nombre Nombre completo.
   * @param email Correo electrónico único.
   * @param password Contraseña.
   * @param role Rol asignado ('admin' o 'employee').
   * @returns Datos del usuario creado.
   */
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

  /**
   * Obtiene la lista completa de usuarios (solo para administradores).
   * @returns Arreglo de usuarios.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users')
  async findAllUsers() {
    return this.authService.findAll();
  }

  /**
   * Elimina un usuario por su ID (solo para administradores).
   * @param id ID del usuario.
   * @returns Mensaje de confirmación.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/delete-user/:id') // Usamos Post o Delete según prefieras
  async deleteUser(@Param('id') id: string) {
    return this.authService.remove(id);
  }

  /**
   * Cambia la contraseña de un usuario (solo para administradores).
   * @param email Email del usuario a modificar.
   * @param newPassword Nueva contraseña.
   * @returns Mensaje de éxito.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/change-password')
  async adminChangePassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.adminChangePasswordByEmail(email, newPassword);
  }

  /**
   * Obtiene la información del perfil del usuario autenticado.
   * @param req Solicitud con el usuario decodificado del JWT.
   * @returns Perfil del usuario.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * Verifica la validez del token JWT actual.
   * @param req Solicitud autenticada.
   * @returns Estado de verificación y datos del usuario.
   */
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Request() req) {
    return {
      ok: true,
      user: req.user,
    };
  }

  /**
   * Sube o actualiza la foto de perfil (avatar) del usuario.
   * @param file Archivo de imagen subido.
   * @param req Solicitud para extraer el ID del usuario del token.
   * @returns URL de la foto subida.
   */
  @UseGuards(JwtAuthGuard) // Esto asegura que solo usuarios logueados suban fotos
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file')) // 'file' es el nombre que le dimos en el FormData de React
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }

    // Obtenemos el ID del usuario directamente del token decodificado
    const userId = req.user.id;

    // Llamamos al servicio para que haga el trabajo pesado
    const avatarUrl = await this.authService.subirAvatar(userId, file);

    return { avatarUrl };
  }
}
