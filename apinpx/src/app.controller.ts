import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from './database/supabase.service';

@Controller()
export class AppController {
  constructor(private readonly supabaseService: SupabaseService) {}

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
