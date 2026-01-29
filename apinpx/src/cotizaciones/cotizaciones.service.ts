// cotizaciones.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class CotizacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  // ===============================
  // 📄 LISTAR COTIZACIONES + VISITAS
  // ===============================
  async listar() {
    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select(`
        id,
        codigo,
        slug,
        created_at,
        visitas (
          id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id,
      codigo: c.codigo,
      slug: c.slug,
      created_at: c.created_at,
      total_visitas: c.visitas?.length ?? 0,
    }));
  }

  // ===============================
  // 📤 CREAR COTIZACIÓN + PDF
  // ===============================
  async crear(codigo: string, pdf: Express.Multer.File) {
    if (!pdf) throw new Error('PDF no recibido');

    const slug = randomUUID().slice(0, 8);
    const filePath = `${slug}.pdf`;

    await this.supabase.client.storage
      .from(process.env.SUPABASE_BUCKET_PDFS!)
      .upload(filePath, pdf.buffer, {
        contentType: pdf.mimetype,
      });

    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .insert({
        codigo,
        slug,
        pdf_path: filePath,
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

  // ===============================
  // 🌍 ABRIR LINK = 1 VISITA
  // ===============================
  async abrirConTracking(slug: string, req: Request) {
    const { data: cotizacion, error } = await this.supabase.client
      .from('cotizaciones')
      .select('id, pdf_path')
      .eq('slug', slug)
      .single();

    if (error || !cotizacion) return null;

    // 👉 crear visita
    const { data: visita, error: visitaError } =
      await this.supabase.client
        .from('visitas')
        .insert({
          cotizacion_id: cotizacion.id,
          visitor_id: randomUUID(),
          ip: req.ip,
          user_agent: req.headers['user-agent'],
        })
        .select()
        .single();

    if (visitaError) throw visitaError;

    // 👉 evento ENTER
    await this.supabase.client.from('eventos').insert({
      visita_id: visita.id,
      tipo: 'enter',
    });

    // 👉 url pública PDF
    const { data: publicUrl } = this.supabase.client.storage
      .from(process.env.SUPABASE_BUCKET_PDFS!)
      .getPublicUrl(cotizacion.pdf_path);

    return {
      pdfUrl: publicUrl.publicUrl,
    };
  }

  // ===============================
  // 📊 MÉTRICAS DASHBOARD
  // ===============================
  async obtenerMetricasDashboard() {
    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select(`
        codigo,
        visitas(id)
      `);

    if (error) throw error;

    const visitasPorCotizacion = (data || []).map(c => ({
      codigo: c.codigo,
      visitas: c.visitas?.length ?? 0,
    }));

    const totalVisitas = visitasPorCotizacion.reduce(
      (acc, v) => acc + v.visitas,
      0,
    );

    return {
      totalCotizaciones: data?.length ?? 0,
      totalVisitas,
      visitasPorCotizacion,
    };
  }
}