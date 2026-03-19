import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

/**
 * Servicio encargado de la lógica de negocio de las cotizaciones.
 * Se comunica con Supabase para el almacenamiento de datos y archivos.
 */
@Injectable()
export class CotizacionesService {
  constructor(private readonly supabase: SupabaseService) { }

  /**
   * Lista cotizaciones con soporte para paginación y filtrado por usuario.
   * @param page Número de página actual.
   * @param limit Cantidad de registros por página.
   * @param userId ID del usuario (opcional si es admin).
   * @param userRole Rol del usuario ('employee' o 'admin').
   * @returns Objeto con los datos de las cotizaciones y metadatos de paginación.
   */
  async listar(page = 1, limit = 10, userId?: string, userRole?: string) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase.client
      .from('cotizaciones')
      .select(
        `
          id, codigo, slug, pdf_path, created_at, user_id, estado, valor,
          visitas ( id )
        `,
        { count: 'exact' },
      );

    if (userRole === 'employee') {
      query = query.eq('user_id', userId);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    let result = (data || []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      slug: c.slug,
      pdf_path: c.pdf_path,
      created_at: c.created_at,
      total_visitas: c.visitas?.length ?? 0,
      user_id: c.user_id,
      estado: c.estado || 'pendiente',
      valor: c.valor,
    }));

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
            asesor: usuario
              ? { nombre: usuario.nombre, email: usuario.email }
              : null,
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

  /**
   * Recupera todas las cotizaciones del sistema para la vista de administrador.
   * @param page Página actual.
   * @param limit Registros por página.
   * @returns Lista de cotizaciones con información del asesor responsable.
   */
  async listarTodasParaAdmin(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
          id, codigo, slug, pdf_path, created_at, user_id, estado, valor,
          visitas ( id )
        `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    let result = (data || []).map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      slug: c.slug,
      pdf_path: c.pdf_path,
      created_at: c.created_at,
      total_visitas: c.visitas?.length ?? 0,
      user_id: c.user_id,
      estado: c.estado || 'pendiente',
      valor: c.valor,
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
            asesor: usuario
              ? {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                role: usuario.role,
              }
              : null,
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

  /**
   * Lista las cotizaciones de un empleado en particular.
   * @param empleadoId ID del empleado.
   * @param page Página actual.
   * @param limit Cantidad por página.
   * @returns Lista de cotizaciones del empleado.
   */
  async listarPorEmpleado(empleadoId: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await this.supabase.client
      .from('cotizaciones')
      .select(
        `
          id, codigo, slug, pdf_path, created_at, estado, valor,
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
        valor: c.valor,
      })),
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    };
  }

  /**
   * Crea una nueva cotización, sube el PDF a Supabase Storage y guarda el registro.
   * @param codigo Código de identificación de la cotización.
   * @param pdf Archivo subido mediante Multer.
   * @param userId ID del usuario que crea la cotización.
   * @param valor Valor monetario (opcional).
   * @returns Resultado de la creación y la URL pública.
   */
  async crear(codigo: string, pdf: Express.Multer.File, userId: string, valor?: number) {
    if (!pdf) throw new Error('PDF no recibido');

    // Validación: solo permitir letras, números, espacios, guiones y guiones bajos (evita emojis)
    const regexCodigo = /^[a-zA-Z0-9\s\-_ñÑáéíóúÁÉÍÓÚ]+$/;
    if (!regexCodigo.test(codigo)) {
      throw new BadRequestException('El código de referencia contiene caracteres no permitidos o emojis');
    }

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
        user_id: userId,
        ...(valor != null ? { valor } : {}),
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

  /**
   * Busca una cotización por su ID y verifica permisos.
   * @param id ID de la cotización de la base de datos.
   * @param userId ID del usuario que consulta.
   * @param role Rol del usuario.
   * @returns Datos de la cotización.
   */
  async obtenerPorId(id: string, userId: string, role: string) {
    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Cotización no encontrada');

    if (role === 'employee' && data.user_id !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }

    return data;
  }

  /**
   * Calcula estadísticas de resumen para administradores.
   * @returns Totales, promedios y máximos de visitas.
   */
  async obtenerEstadisticasGlobales() {
    // 🔢 Total de cotizaciones
    const { count: totalCotizaciones } = await this.supabase.client
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true });

    // 🔢 Total de visitas
    const { count: totalVisitas } = await this.supabase.client
      .from('visitas')
      .select('*', { count: 'exact', head: true });

    // 🔥 Traer todas las visitas para calcular la más vista
    const { data: visitasData, error } = await this.supabase.client
      .from('visitas')
      .select('cotizacion_id');

    if (error) {
      console.error('Error obteniendo visitas:', error);
    }

    let masVista = 0;

    if (visitasData && visitasData.length > 0) {
      const contador: Record<string, number> = {};

      visitasData.forEach((v: any) => {
        contador[v.cotizacion_id] =
          (contador[v.cotizacion_id] || 0) + 1;
      });

      masVista = Math.max(...Object.values(contador));
    }

    // 📊 Promedio
    const promedioVisitas =
      totalCotizaciones && totalCotizaciones > 0
        ? Math.round((totalVisitas ?? 0) / totalCotizaciones)
        : 0;

    return {
      totalCotizaciones: totalCotizaciones ?? 0,
      totalVisitas: totalVisitas ?? 0,
      promedioVisitas,
      masVista,
    };
  }

  /**
   * Obtiene las métricas necesarias para el panel principal del usuario.
   * @param userId ID del usuario.
   * @param role Rol del usuario.
   * @returns Objeto con las métricas.
   */
  async obtenerMetricasDashboard(userId: string, role: string) {
    if (role === 'admin') return this.obtenerEstadisticasGlobales();

    const { count: cotizaciones } = await this.supabase.client
      .from('cotizaciones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: visitas } = await this.supabase.client
      .from('visitas')
      .select('id, cotizaciones!inner(user_id)', { count: 'exact', head: true })
      .eq('cotizaciones.user_id', userId);

    return {
      totalCotizaciones: cotizaciones ?? 0,
      totalVisitas: visitas ?? 0,
    };
  }

  /**
   * Obtiene un desglose del desempeño de cotizaciones por cada empleado.
   * @returns Arreglo de estadísticas por empleado.
   */
  async obtenerEstadisticasEmpleados() {
    const { data: cotizaciones, error } = await this.supabase.client
      .from('cotizaciones')
      .select('user_id, estado');

    if (error) {
      console.error('Error obteniendo cotizaciones para estadísticas:', error);
      return [];
    }

    const conteo: Record<string, { total: number; ganadas: number; perdidas: number }> = {};
    cotizaciones.forEach((c) => {
      if (c.user_id) {
        if (!conteo[c.user_id]) conteo[c.user_id] = { total: 0, ganadas: 0, perdidas: 0 };
        conteo[c.user_id].total++;                                    // ← siempre suma
        if (c.estado === 'ganada') conteo[c.user_id].ganadas++;
        if (c.estado === 'perdida') conteo[c.user_id].perdidas++;
      }
    });

    const userIds = Object.keys(conteo);
    if (userIds.length === 0) return [];

    const { data: usuarios } = await this.supabase.client
      .from('usuarios')
      .select('id, nombre, email')
      .in('id', userIds);

    return (usuarios || []).map((u) => ({
      id: u.id,
      nombre: u.nombre || u.email,
      cotizaciones: conteo[u.id]?.total || 0,
      ganadas: conteo[u.id]?.ganadas || 0,
      perdidas: conteo[u.id]?.perdidas || 0,
    })).sort((a, b) => b.cotizaciones - a.cotizaciones);
  }

  /**
   * Recupera las cotizaciones que tienen estado Ganada o Perdida.
   * @param requestUserId Usuario que realiza la petición.
   * @param role Rol del peticionario.
   * @param filtroUserId ID de usuario para filtrar (opcional para admins).
   * @returns Listas separadas de ganadas/perdidas y el total ganado.
   */
  async obtenerCerradas(requestUserId: string, role: string, filtroUserId?: string) {
    let query = this.supabase.client
      .from('cotizaciones')
      .select(`id, codigo, slug, created_at, estado, user_id, valor, visitas(id)`)
      .in('estado', ['ganada', 'perdida'])
      .order('created_at', { ascending: false });

    // Empleado solo ve las suyas
    if (role === 'employee') {
      query = query.eq('user_id', requestUserId);
    } else if (filtroUserId) {
      query = query.eq('user_id', filtroUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Enriquecer con asesor
    const userIds = [...new Set((data || []).map(c => c.user_id).filter(Boolean))];
    let usuariosMap = new Map();

    if (userIds.length > 0) {
      const { data: usuarios } = await this.supabase.client
        .from('usuarios').select('id, nombre, email').in('id', userIds);
      usuariosMap = new Map(usuarios?.map(u => [u.id, u]) || []);
    }

    const mapped = (data || []).map((c: any) => {
      const u = usuariosMap.get(c.user_id);
      return {
        id: c.id, codigo: c.codigo, slug: c.slug,
        created_at: c.created_at, estado: c.estado,
        total_visitas: c.visitas?.length ?? 0,
        valor: c.valor ?? null,
        asesor: u ? { nombre: u.nombre, email: u.email } : null,
      };
    });

    const ganadas = mapped.filter(c => c.estado === 'ganada');
    const perdidas = mapped.filter(c => c.estado === 'perdida');

    // Sumar valores de cotizaciones ganadas (solo las que tienen valor definido)
    const totalGanado = ganadas.reduce((sum, c) => sum + (c.valor ?? 0), 0);

    return { ganadas, perdidas, totalGanado };
  }

  /**
   * Obtiene el top 5 de las cotizaciones con más visitas para visualización en gráficas.
   * @returns Arreglo con nombres y conteo de visitas.
   */
  async obtenerCotizacionesMasVistas() {
    // Traemos el código y las visitas relacionadas
    const { data, error } = await this.supabase.client
      .from('cotizaciones')
      .select('codigo, visitas(id)');

    if (error) {
      console.error('Error calculando top vistas:', error);
      return [];
    }

    // Mapeamos para obtener el formato que necesita el gráfico { name, value }
    const stats = (data || []).map((c: any) => ({
      name: `Cotización ${c.codigo}`, // Nombre para la etiqueta
      value: c.visitas?.length ?? 0,  // Cantidad de visitas
    }));

    // 1. Filtramos las que tienen 0 visitas (para que no salga vacío)
    // 2. Ordenamos de Mayor a Menor (descendente)
    // 3. Tomamos solo las 5 primeras
    return stats
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }


  /**
   * Registra una visita y abre el tracking cuando un cliente accede al PDF.
   * @param slug Slug único de la cotización.
   * @param req Solicitud Express para capturar metadatos.
   * @returns Datos necesarios para visualizar la cotización desde el cliente.
   */
  async abrirConTracking(slug: string, req: Request) {
    const { data: cotizacion, error } = await this.supabase.client
      .from('cotizaciones')
      .select('id, codigo, pdf_path, user_id')
      .eq('slug', slug)
      .single();

    if (error || !cotizacion) throw new NotFoundException('Cotización no encontrada');

    const { data: visita } = await this.supabase.client
      .from('visitas')
      .insert({
        cotizacion_id: cotizacion.id,
        visitor_id: randomUUID(),
        ip: req.ip,
        user_agent: req.headers['user-agent'],
        fecha_entrada: new Date().toISOString(),
      })
      .select()
      .single();

    await this.supabase.client.from('eventos').insert({
      visita_id: visita.id,
      tipo: 'enter',
    });

    let asesorNombre = 'Asesor Kombai';
    let asesorEmail: string | null = null;

    if (cotizacion.user_id) {
      const { data: usuario } = await this.supabase.client
        .from('usuarios')
        .select('nombre, email')
        .eq('id', cotizacion.user_id)
        .single();

      if (usuario?.nombre) asesorNombre = usuario.nombre;
      if (usuario?.email) asesorEmail = usuario.email;
    }



    // 🔔 WEBHOOK (ÚNICO CAMBIO)
    if (process.env.WEBHOOK_URL) {
      fetch(process.env.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'cotizacion_abierta',
          cotizacion: {
            id: cotizacion.id,
            codigo: cotizacion.codigo,
          },
          visita_id: visita.id,
          asesor: {
            nombre: asesorNombre,
            email: asesorEmail,
          },
          fecha_hour: new Date().toISOString(),
        }),
      }).catch(() => { });
    }

    const { data: publicUrl } = this.supabase.client.storage
      .from(process.env.SUPABASE_BUCKET_PDFS!)
      .getPublicUrl(cotizacion.pdf_path);

    return {
      pdfUrl: publicUrl.publicUrl,
      visitaId: visita.id,
      codigo: cotizacion.codigo,
      asesorNombre,
    };
  }

  /**
   * Elimina un registro de cotización y sus visitas asociadas.
   * @param cotizacionId ID de la cotización.
   * @param userId ID del usuario solicitante.
   * @param userRole Rol del usuario.
   * @returns Confirmación de eliminación.
   */
  async eliminar(cotizacionId: string, userId: string, userRole: string) {
    const { data: cotizacion } = await this.supabase.client
      .from('cotizaciones')
      .select('id, user_id')
      .eq('id', cotizacionId)
      .single();

    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');

    if (userRole === 'employee' && cotizacion.user_id !== userId) {
      throw new ForbiddenException('No tienes permiso');
    }

    await this.supabase.client.from('visitas').delete().eq('cotizacion_id', cotizacionId);
    await this.supabase.client.from('cotizaciones').delete().eq('id', cotizacionId);

    return { ok: true };
  }

  /**
   * Cambia el estado de una cotización y valida pertenencia si es empleado.
   * @param id ID de la cotización.
   * @param estado Nuevo estado.
   * @param userId ID del usuario.
   * @param role Rol del usuario.
   * @returns Mensaje de éxito.
   */
  async cambiarEstado(id: string, estado: string, userId: string, role: string) {
    // 1. Verificamos que la cotización exista y obtenemos su dueño
    const { data: cotizacion, error: findError } = await this.supabase.client
      .from('cotizaciones')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !cotizacion) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // 2. Si es empleado, verificamos que sea dueño de la cotización
    if (role === 'employee' && cotizacion.user_id !== userId) {
      throw new ForbiddenException('No tienes permiso para modificar esta cotización');
    }

    // 3. Actualizamos el estado
    const { error: updateError } = await this.supabase.client
      .from('cotizaciones')
      .update({ estado })
      .eq('id', id);

    if (updateError) {
      throw new Error('Error al actualizar el estado: ' + updateError.message);
    }

    return { ok: true, mensaje: `Estado actualizado a ${estado}` };
  }

}
