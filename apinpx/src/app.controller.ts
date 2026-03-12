import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';

/**
 * Controlador base de la aplicación para pruebas de conectividad iniciales.
 */
@Controller()
export class AppController {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Endpoint de prueba para verificar la conexión con Supabase.
   * @returns Datos de una cotización de prueba o error de conexión.
   */
  @Get('test-supabase')
  async testSupabase() {
    const supabase = this.supabaseService.client;
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .limit(1);

    if (error) {
      return { ok: false, error };
    }

    return { ok: true, data };
  }
}
