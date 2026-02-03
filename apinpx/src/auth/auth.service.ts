import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../database/supabase.service';
import * as bcrypt from 'bcrypt';

interface LoginAttempt {
  count: number;
  blockedUntil: Date | null;
}

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

    // Buscar usuario (AHORA INCLUYE ROLE)
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
  // 🎫 GENERAR TOKEN JWT (ACTUALIZADO CON ROLE)
  // ===============================
  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      nombre: user.nombre,
      role: user.role || 'employee', // Incluir role en el payload
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role || 'employee', // Incluir role en la respuesta
      },
    };
  }

  // ===============================
  // 👤 REGISTRAR NUEVO USUARIO
  // ===============================
  async register(
    nombre: string,
    email: string,
    password: string,
    role: string = 'employee', // Por defecto es employee
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

    // ⚠️ NOTA DE SEGURIDAD: En producción, solo admins deberían poder crear otros admins
    // Opción 1: Solo permitir 'employee' durante el registro público
    // Opción 2: Agregar validación de token de invitación para crear admins
    // Opción 3: Solo admins autenticados pueden crear otros admins
    
    // Validar role
    if (!['admin', 'employee'].includes(role)) {
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
        role, // Incluir role al crear usuario
      })
      .select()
      .single();

    if (error) throw error;

    return this.login(user);
  }

  // ===============================
  // 🔍 VERIFICAR TOKEN
  // ===============================
  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ===============================
  // 📊 OBTENER PERFIL DEL USUARIO ACTUAL
  // ===============================
  async getProfile(userId: string) {
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .select('id, nombre, email, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }
}