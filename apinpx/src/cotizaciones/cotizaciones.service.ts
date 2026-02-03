import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class CotizacionesService {
  constructor(private readonly supabase: SupabaseService) {}

  // ======================================================
  // 📄 LISTAR COTIZACIONES (CON CONTROL DE ROL)
  // ======================================================
  async listar(page = 1, limit = 10, userId?: string, userRole?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.client
      .from('cotizaciones')
      .select(
        `
        id,
        codigo,
        slug,
        pdf_path,
        created_at,
        user_id,
        visitas ( id )
      `,
        { count: 'exact' },
      );

    // Si es employee, solo ver sus propias cotizaciones
    if (userRole === 'employee') {
      query = query.eq('user_id', userId);
    }
    // Si es admin, ver todas (no se agrega filtro)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Si es admin, obtener información de usuarios para cada cotización
    let result = (data || []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      slug: c.slug,
      pdf_path: c.pdf_path,
      created_at: c.created_at,
      total_visitas: c.visitas?.length ?? 0,
      user_id: c.user_id,
    }));

    // Si es admin, agregar información del asesor
    if (userRole === 'admin' && result.length > 0) {
      const userIds = [...new Set(result.map(c => c.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: usuarios } = await this.supabase.client
          .from('usuarios')
          .select('id, nombre, email')
          .in('id', userIds);

        const usuariosMap = new Map(usuarios?.map(u => [u.id, u]) || []);

        result = result.map(c => {
          const usuario = usuariosMap.get(c.user_id);
          return {
            ...c,
            asesor: usuario ? {
              nombre: usuario.nombre,
              email: usuario.email,
            } : null,
          };
        });
      }
    }

    return {
      data: result,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  // ======================================================
  // 👥 LISTAR TODAS LAS COTIZACIONES (SOLO ADMIN)
  // ======================================================
  async listarTodasParaAdmin(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
        id,
        codigo,
        slug,
        pdf_path,
        created_at,
        user_id,
        visitas ( id )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Obtener información de usuarios
    let result = (data || []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      slug: c.slug,
      pdf_path: c.pdf_path,
      created_at: c.created_at,
      total_visitas: c.visitas?.length ?? 0,
      user_id: c.user_id,
    }));

    if (result.length > 0) {
      const userIds = [...new Set(result.map(c => c.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: usuarios } = await this.supabase.client
          .from('usuarios')
          .select('id, nombre, email, role')
          .in('id', userIds);

        const usuariosMap = new Map(usuarios?.map(u => [u.id, u]) || []);

        result = result.map(c => {
          const usuario = usuariosMap.get(c.user_id);
          return {
            ...c,
            asesor: usuario ? {
              id: usuario.id,
              nombre: usuario.nombre,
              email: usuario.email,
              role: usuario.role,
            } : null,
          };
        });
      }
    }

    return {
      data: result,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  // ======================================================
  // 👤 LISTAR COTIZACIONES DE UN EMPLEADO (SOLO ADMIN)
  // ======================================================
  async listarPorEmpleado(empleadoId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
        id,
        codigo,
        slug,
        pdf_path,
        created_at,
        visitas ( id )
      `,
        { count: 'exact' },
      )
      .eq('user_id', empleadoId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: (data || []).map((c: any) => ({
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
  async crear(codigo: string, pdf: Express.Multer.File, userId: string) {
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
        user_id: userId, // Ahora es requerido
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
  // 🔍 OBTENER UNA COTIZACIÓN (CON CONTROL DE ACCESO)
  // ======================================================
  async obtenerPorId(cotizacionId: string, userId: string, userRole: string) {
    const { data: cotizacion, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
        id,
        codigo,
        slug,
        pdf_path,
        created_at,
        user_id,
        visitas (
          id,
          visitor_id,
          ip,
          fecha_entrada,
          eventos (
            tipo,
            created_at
          )
        )
      `,
      )
      .eq('id', cotizacionId)
      .single();

    if (error || !cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // Si es employee, verificar que sea su cotización
    if (userRole === 'employee' && cotizacion.user_id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta cotización');
    }

    const result: any = {
      id: cotizacion.id,
      codigo: cotizacion.codigo,
      slug: cotizacion.slug,
      pdf_path: cotizacion.pdf_path,
      created_at: cotizacion.created_at,
      total_visitas: cotizacion.visitas?.length ?? 0,
      visitas: cotizacion.visitas || [],
    };

    // Si es admin, obtener información del usuario
    if (userRole === 'admin' && cotizacion.user_id) {
      const { data: usuario } = await this.supabase.client
        .from('usuarios')
        .select('nombre, email')
        .eq('id', cotizacion.user_id)
        .single();

      if (usuario) {
        result.asesor = {
          nombre: usuario.nombre,
          email: usuario.email,
        };
      }
    }

    return result;
  }

  // ======================================================
  // 🌍 ABRIR LINK PÚBLICO + TRACKING + WEBHOOK
  // ======================================================
  async abrirConTracking(slug: string, req: Request) {
    const { data: cotizacion, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
        id,
        codigo,
        pdf_path,
        user_id
      `,
      )
      .eq('slug', slug)
      .single();

    if (error || !cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    const visitorId = randomUUID();

    const { data: visita, error: visitaError } = await this.supabase.client
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
      let asesor = {
        nombre: 'Sin asesor',
        email: 'N/A',
        id: null,
      };
      
      // Obtener información completa del asesor
      if (cotizacion.user_id) {
        const { data: usuario } = await this.supabase.client
          .from('usuarios')
          .select('id, nombre, email')
          .eq('id', cotizacion.user_id)
          .single();
        
        if (usuario) {
          asesor = {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
          };
        }
      }
      
      fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'cotizacion_abierta',
          asesor: {
            id: asesor.id,
            nombre: asesor.nombre,
            email: asesor.email,
          },
          cotizacion: {
            codigo: cotizacion.codigo,
            id: cotizacion.id,
          },
          fecha_hora: new Date().toISOString(),
        }),
      }).catch((error) => {
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
  // 📊 MÉTRICAS DASHBOARD (CON CONTROL DE ROL)
  // ======================================================
  async obtenerMetricasDashboard(userId?: string, userRole?: string) {
    let query = this.supabase.client.from('cotizaciones').select(`
      codigo,
      user_id,
      visitas ( id )
    `);

    // Si es employee, solo sus cotizaciones
    if (userRole === 'employee') {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const visitasPorCotizacion = (data || []).map((c: any) => ({
      codigo: c.codigo,
      visitas: c.visitas?.length ?? 0,
    }));

    return {
      totalCotizaciones: data?.length ?? 0,
      totalVisitas: visitasPorCotizacion.reduce((acc, v) => acc + v.visitas, 0),
      visitasPorCotizacion,
    };
  }

  // ======================================================
  // 📊 ESTADÍSTICAS GLOBALES (SOLO ADMIN)
  // ======================================================
  async obtenerEstadisticasGlobales() {
    // Total de cotizaciones
    const { count: totalCotizaciones } = await this.supabase.client
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true });

    // Total de visitas
    const { count: totalVisitas } = await this.supabase.client
      .from('visitas')
      .select('*', { count: 'exact', head: true });

    // Obtener todos los usuarios que tienen cotizaciones
    const { data: cotizaciones } = await this.supabase.client
      .from('cotizaciones')
      .select('user_id');

    const userIds = [...new Set(cotizaciones?.map(c => c.user_id).filter(Boolean))];

    if (userIds.length === 0) {
      return {
        totalCotizaciones: totalCotizaciones ?? 0,
        totalVisitas: totalVisitas ?? 0,
        empleados: [],
      };
    }

    // Obtener información de usuarios
    const { data: usuarios } = await this.supabase.client
      .from('usuarios')
      .select('id, nombre, email')
      .in('id', userIds);

    // Contar cotizaciones por empleado
    const empleadosMap = new Map();
    cotizaciones?.forEach((c: any) => {
      const userId = c.user_id;
      if (!empleadosMap.has(userId)) {
        empleadosMap.set(userId, 0);
      }
      empleadosMap.set(userId, empleadosMap.get(userId) + 1);
    });

    const empleados = usuarios?.map(usuario => ({
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
      },
      cantidad: empleadosMap.get(usuario.id) || 0,
    })) || [];

    return {
      totalCotizaciones: totalCotizaciones ?? 0,
      totalVisitas: totalVisitas ?? 0,
      empleados,
    };
  }
}