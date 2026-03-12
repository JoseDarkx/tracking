import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Servicio encargado de inicializar y proporcionar el cliente de Supabase.
 * Utiliza las variables de entorno para configurar la conexión con el servidor.
 */
@Injectable()
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Proporciona acceso directo al cliente de Supabase para realizar consultas.
   * @returns Instancia de SupabaseClient.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }
}
