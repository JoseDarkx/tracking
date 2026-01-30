import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class CotizacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  // ======================================================
  // 📄 LISTAR COTIZACIONES (DASHBOARD)
  // ======================================================
  async listar(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { count, error: countError } = await this.supabase.client
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select(`
        id,
        codigo,
        slug,
        pdf_path,
        created_at,
        visitas ( id )
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []).map(c => ({
        id: c.id,
        codigo: c.codigo,
        slug: c.slug,
        pdf_path: c.pdf_path,
        created_at: c.created_at,
        total_visitas: c.visitas?.length ?? 0,
      })),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  // ======================================================
  // 📤 CREAR COTIZACIÓN + SUBIR PDF
  // ======================================================
  async crear(codigo: string, pdf: Express.Multer.File, userId?: string) {
    if (!pdf) throw new Error('PDF no recibido');

    const slug = randomUUID().slice(0, 8);
    const filePath = `${slug}.pdf`;

    const { error: uploadError } = await this.supabase.client.storage
      .from(process.env.SUPABASE_BUCKET_PDFS!)
      .upload(filePath, pdf.buffer, {
        contentType: pdf.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .insert({
        codigo,
        slug,
        pdf_path: filePath,
        user_id: userId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ok: true,
      cotizacion: data,
      publicUrl: `${process.env.BASE_PUBLIC_URL}/c/${slug}`,
    };
  }

  // ======================================================
  // 🌍 ABRIR LINK PÚBLICO + TRACKING + WEBHOOK
  // ======================================================
  async abrirConTracking(slug: string, req: Request) {
    const { data: cotizacion, error } = await this.supabase.client
      .from('cotizaciones')
      .select(`
        id,
        codigo,
        pdf_path,
        user_id,
        usuarios (
          nombre
        )
      `)
      .eq('slug', slug)
      .single();

    if (error || !cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    const visitorId = randomUUID();

    const { data: visita, error: visitaError } =
      await this.supabase.client
        .from('visitas')
        .insert({
          cotizacion_id: cotizacion.id,
          visitor_id: visitorId,
          ip: req.ip,
          user_agent: req.headers['user-agent'],
          fecha_entrada: new Date().toISOString(),
        })
        .select()
        .single();

    if (visitaError) throw visitaError;

    // 🟢 EVENTO ENTER
    await this.supabase.client.from('eventos').insert({
      visita_id: visita.id,
      tipo: 'enter',
    });

   
   // 🔔 WEBHOOK (NO BLOQUEANTE)
    if (process.env.WEBHOOK_URL) {
      fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'cotizacion_abierta',

          // 👤 Asesor
          asesor: cotizacion.usuarios?.[0]?.nombre ?? 'Sin asesor',

          // 📄 Cotización
          cotizacion: cotizacion.codigo,

          // 🕒 Fecha y hora
          fecha_hora: new Date().toISOString(),
        }),
      }).catch(error => {
        console.error('❌ Error enviando webhook:', error.message);
      });
    }

    const { data: publicUrl } = this.supabase.client.storage
      .from(process.env.SUPABASE_BUCKET_PDFS!)
      .getPublicUrl(cotizacion.pdf_path);

    return {
      pdfUrl: publicUrl.publicUrl,
      visitaId: visita.id,
    };
  }

  // ======================================================
  // 📊 MÉTRICAS DASHBOARD
  // ======================================================
  async obtenerMetricasDashboard() {
    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select(`
        codigo,
        visitas ( id )
      `);

    if (error) throw error;

    const visitasPorCotizacion = (data || []).map(c => ({
      codigo: c.codigo,
      visitas: c.visitas?.length ?? 0,
    }));

    return {
      totalCotizaciones: data?.length ?? 0,
      totalVisitas: visitasPorCotizacion.reduce(
        (acc, v) => acc + v.visitas,
        0,
      ),
      visitasPorCotizacion,
    };
  }
}
