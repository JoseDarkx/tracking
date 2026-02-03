import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly supabase: SupabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'tu-secreto-super-seguro',
    });
  }

  async validate(payload: any) {
    // Obtener el usuario completo con su role desde la base de datos
    const { data: user, error } = await this.supabase.client
      .from('usuarios')
      .select('id, email, nombre, role')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role || 'employee', // default a employee si no tiene role
    };
  }
}