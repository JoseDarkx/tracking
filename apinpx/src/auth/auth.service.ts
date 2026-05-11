import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../database/supabase.service';
import * as bcrypt from 'bcrypt';

interface LoginAttempt {
  count: number;
  blockedUntil: Date | null;
}

/**
 * Servicio encargado de la gestión de autenticación, usuarios y seguridad.
 */
@Injectable()
export class AuthService {
  private loginAttempts: Map<string, LoginAttempt> = new Map();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ===============================
  // 🔐 VALIDAR USUARIO
  // ===============================
  /**
   * Valida las credenciales de un usuario y maneja bloqueos por intentos fallidos.
   * @param email Correo electrónico.
   * @param password Contraseña en texto plano.
   * @returns Usuario sin la contraseña hash si es válido.
   * @throws UnauthorizedException si las credenciales son inválidas o la cuenta esté bloqueada.
   */
  async validateUser(email: string, password: string): Promise<any> {
    // Verificar si está bloqueado
    const attempt = this.loginAttempts.get(email);
    if (attempt?.blockedUntil && new Date() < attempt.blockedUntil) {
      const remainingTime = Math.ceil(
        (attempt.blockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intenta de nuevo en ${remainingTime} minutos`,
      );
    }

    // Buscar usuario
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      this.registerFailedAttempt(email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      this.registerFailedAttempt(email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Login exitoso - resetear intentos
    this.loginAttempts.delete(email);

    const { password_hash, ...result } = user;
    return result;
  }

  // ===============================
  // 📝 REGISTRAR INTENTO FALLIDO
  // ===============================
  /**
   * Registra un intento fallido de inicio de sesión y aplica bloqueos temporales.
   * @param email Correo electrónico que falló.
   */
  private registerFailedAttempt(email: string) {
    const attempt = this.loginAttempts.get(email) || {
      count: 0,
      blockedUntil: null,
    };
    attempt.count += 1;

    if (attempt.count >= 3) {
      attempt.blockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
      attempt.count = 0;
    }

    this.loginAttempts.set(email, attempt);

    const remainingAttempts = 3 - attempt.count;
    if (remainingAttempts > 0) {
      throw new UnauthorizedException(
        `Credenciales inválidas. Te quedan ${remainingAttempts} intentos`,
      );
    }
  }

  // ===============================
  // 🎫 GENERAR TOKEN JWT
  // ===============================
  /**
   * Genera el token de acceso JWT para un usuario validado.
   * @param user Objeto de usuario obtenido de la BD.
   * @returns Objeto con el token JWT y datos básicos del usuario.
   */
  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      nombre: user.nombre,
      role: user.role || 'employee',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role || 'employee',
        avatarUrl: user.avatarUrl, // <--- FOTO AÑADIDA AQUÍ
      },
    };
  }

  // ===============================
  // 👤 REGISTRAR NUEVO USUARIO
  // ===============================
  /**
   * Registra a un nuevo usuario en la base de datos con contraseña encriptada.
   * @param nombre Nombre completo.
   * @param email Email único.
   * @param password Contraseña en texto plano.
   * @param role Rol del usuario ('employee', 'admin', 'superadmin').
   * @returns Resultado del login para el nuevo usuario.
   */
  async register(
    nombre: string,
    email: string,
    password: string,
    role: string = 'employee',
  ) {
    // Verificar si el email ya existe
    const { data: existing } = await this.supabase.client
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new UnauthorizedException('El email ya está registrado');
    }

    // Validar role
    if (!['admin', 'employee', 'superadmin'].includes(role)) {
      throw new UnauthorizedException('Role inválido');
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .insert({
        nombre,
        email,
        password_hash,
        role,
      })
      .select()
      .single();

    if (error) throw error;

    return this.login(user);
  }

  // ===============================
  // 👥 LISTAR TODOS LOS USUARIOS
  // ===============================
  /**
   * Obtiene la lista de todos los usuarios registrados.
   * @returns Arreglo de usuarios con datos públicos.
   */
  async findAll() {
    const { data, error } = await this.supabase.client
      .from('usuarios')
      .select('id, nombre, email, role, avatarUrl, created_at') // <--- Añadí la foto para la lista de usuarios también
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data;
  }

  // ===============================
  // 🗑️ ELIMINAR USUARIO
  // ===============================
  /**
   * Elimina un usuario permanentemente por su identificador.
   * @param id ID del usuario.
   * @returns Mensaje de éxito.
   */
  async remove(id: string) {
    const { error } = await this.supabase.client
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Usuario eliminado correctamente' };
  }

  // ===============================
  // 🔍 VERIFICAR TOKEN
  // ===============================
  /**
   * Verifica la autenticidad de un token JWT.
   * @param token String del token.
   * @returns Payload decodificado si es válido.
   */
  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ===============================
  // 🔑 CAMBIAR PASSWORD (SOLO ADMIN)
  // ===============================
  /**
   * Cambia la contraseña de un usuario por parte de un administrador.
   * @param email Email del destinatario.
   * @param newPassword Nueva contraseña en texto plano.
   * @returns Mensaje informativo del cambio.
   */
  async adminChangePasswordByEmail(email: string, newPassword: string) {
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await this.supabase.client
      .from('usuarios')
      .update({ password_hash: hashedPassword })
      .eq('email', email);

    if (updateError) {
      throw new Error('Error actualizando contraseña');
    }

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ===============================
  // 📊 OBTENER PERFIL DEL USUARIO ACTUAL
  // ===============================
  /**
   * Recupera los datos del perfil de un usuario por su ID.
   * @param userId ID del usuario.
   * @returns Datos del perfil.
   */
  async getProfile(userId: string) {
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .select('id, nombre, email, role, avatarUrl, created_at') // <--- FOTO AÑADIDA AQUÍ
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  // ===============================
  // 📸 SUBIR FOTO DE PERFIL
  // ===============================
  /**
   * Sube una imagen de avatar a Supabase Storage y actualiza el perfil del usuario.
   * @param userId ID del usuario.
   * @param file Archivo subido (buffer y metadatos).
   * @returns URL pública de la imagen alojada.
   */
  async subirAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    // 1. Instancia correcta de Supabase
    const supabase = this.supabase.client;

    // 2. Generamos un nombre único para la foto
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    // 3. Subimos el archivo al bucket 'avatars'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error(uploadError);
      throw new Error('Error al subir la imagen a Supabase');
    }

    // 4. Obtenemos la URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // 5. Guardamos esa URL en la tabla 'usuarios'
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ avatarUrl: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error(updateError);
      throw new Error('Error al guardar la URL en la base de datos');
    }

    return publicUrl;
  }
}
