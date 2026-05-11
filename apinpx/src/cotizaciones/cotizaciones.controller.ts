import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  Param,
  NotFoundException,
  Patch,
  BadRequestException,
  Req,
  Res,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CotizacionesService } from './cotizaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { Request, Response } from 'express';

interface UserPayload {
  id: string;
  email: string;
  nombre: string;
  role: string;
}

/**
 * Controlador para la gestión de cotizaciones.
 * Maneja las rutas de administración y las rutas de empleados para crear,
 * listar, actualizar y eliminar cotizaciones.
 */
@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard) // 👈 Proteger todas las rutas
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) { }

  // ======================================================
  // 🔒 RUTAS PARA ADMINISTRADORES
  // ======================================================

  /**
   * Obtiene todas las cotizaciones del sistema (Solo para administradores).
   * @param page Número de página para la paginación.
   * @param limit Cantidad de registros por página.
   * @returns Lista paginada de todas las cotizaciones.
   */
  @Get('admin/cotizaciones')
  @Roles('admin')
  listarTodasParaAdmin(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.service.listarTodasParaAdmin(parseInt(page), parseInt(limit));
  }

  /**
   * Obtiene cotizaciones del sistema para exportar a Excel.
   * Acepta ?mes= y ?anio= para filtrar por período. Si no se pasan, devuelve todo.
   * @returns Lista de cotizaciones con datos del asesor.
   */
  @Get('admin/cotizaciones/reporte')
  @Roles('admin')
  listarParaReporte(@Query('mes') mes?: string, @Query('anio') anio?: string) {
    const mesNum = mes ? parseInt(mes, 10) : undefined;
    const anioNum = anio ? parseInt(anio, 10) : undefined;
    return this.service.listarParaReporte(mesNum, anioNum);
  }

  /**
   * Obtiene las cotizaciones de un empleado específico (Solo para administradores).
   * @param empleadoId ID del empleado cuyas cotizaciones se desean consultar.
   * @param page Número de página.
   * @param limit Cantidad de registros por página.
   * @returns Lista paginada de cotizaciones del empleado.
   */
  @Get('admin/cotizaciones/empleado/:empleadoId')
  @Roles('admin')
  listarPorEmpleado(
    @Param('empleadoId') empleadoId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.service.listarPorEmpleado(
      empleadoId,
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * Obtiene estadísticas globales de las cotizaciones (Solo para administradores).
   * @returns Resumen de estadísticas globales.
   */
  @Get('admin/estadisticas')
  @Roles('admin')
  obtenerEstadisticasGlobales() {
    return this.service.obtenerEstadisticasGlobales();
  }

  /**
   * Obtiene estadísticas detalladas por cada empleado (Solo para administradores).
   * @returns Lista de estadísticas agrupadas por empleado.
   */
  @Get('admin/estadisticas/empleados')
  @Roles('admin')
  obtenerEstadisticasEmpleados() {
    return this.service.obtenerEstadisticasEmpleados();
  }

  /**
   * Cambia el estado de una cotización específica.
   * @param id ID de la cotización.
   * @param estado Nuevo estado (pendiente, ganada o perdida).
   * @param user Datos del usuario autenticado que realiza la acción.
   * @throws BadRequestException si el estado no es válido.
   * @returns La cotización actualizada.
   */
  @Patch('cotizaciones/:id/estado')
  @Roles('employee', 'admin')
  cambiarEstado(
    @Param('id') id: string,
    @Body('estado') estado: string,
    @CurrentUser() user: UserPayload,
  ) {
    // Validamos que el estado sea correcto para evitar basura en la DB
    if (!['pendiente', 'ganada', 'perdida'].includes(estado)) {
      throw new BadRequestException(
        'Estado inválido. Debe ser: pendiente, ganada o perdida.',
      );
    }

    // Llamamos al servicio pasando el ID, el nuevo estado, quién lo pide y su rol
    return this.service.cambiarEstado(id, estado, user.id, user.role);
  }

  /**
   * Obtiene el ranking de las cotizaciones más vistas (Solo para administradores).
   * @returns Lista de las cotizaciones con mayor número de visualizaciones.
   */
  @Get('admin/estadisticas/top-vistas')
  @Roles('admin')
  obtenerTopVistas() {
    return this.service.obtenerCotizacionesMasVistas();
  }

  // ======================================================
  // 🔒 RUTAS PARA EMPLEADOS (y admins también pueden acceder)
  // ======================================================

  /**
   * Lista las cotizaciones del usuario actual. Si el usuario es administrador, lista todas.
   * @param page Número de página.
   * @param limit Cantidad de registros por página.
   * @param user Datos del usuario autenticado.
   * @returns Lista paginada de cotizaciones.
   */
  @Get('cotizaciones')
  @Roles('employee', 'admin')
  listar(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sortBy') sortBy?: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.listar(
      parseInt(page),
      parseInt(limit),
      user.id,
      user.role,
      sortBy,
    );
  }

  /**
   * Crea una nueva cotización con un archivo PDF adjunto.
   * @param pdf Archivo PDF de la cotización.
   * @param codigo Código identificador único para la cotización.
   * @param valorStr Valor monetario de la cotización (opcional).
   * @param user Datos del usuario que crea la cotización.
   * @returns La cotización recién creada.
   */
  @Post('cotizaciones')
  @Roles('employee', 'admin')
  @UseInterceptors(FileInterceptor('pdf'))
  crear(
    @UploadedFile() pdf: Express.Multer.File,
    @Body('codigo') codigo: string,
    @Body('valor') valorStr: string,
    @CurrentUser() user: UserPayload,
  ) {
    const valor = valorStr ? parseFloat(valorStr) : undefined;
    return this.service.crear(codigo, pdf, user.id, valor);
  }

  /**
   * Obtiene las cotizaciones que ya han sido cerradas (ganadas o perdidas).
   * @param user Datos del usuario autenticado.
   * @param userId ID de un usuario específico (opcional, para filtrar).
   * @returns Lista de cotizaciones cerradas.
   */
  @Get('cotizaciones/cerradas')
  @Roles('employee', 'admin')
  async getCerradas(
    @CurrentUser() user: UserPayload,
    @Query('userId') userId?: string,
  ) {
    return this.service.obtenerCerradas(user.id, user.role, userId);
  }

  /**
   * Obtiene el detalle de una cotización por su ID.
   * @param id ID de la cotización.
   * @param user Datos del usuario autenticado.
   * @returns Detalle de la cotización solicitada.
   */
  @Get('cotizaciones/:id')
  @Roles('employee', 'admin')
  obtenerPorId(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.service.obtenerPorId(id, user.id, user.role);
  }

  /**
   * Obtiene las métricas para el dashboard del usuario.
   * Si es admin, devuelve métricas globales; si es empleado, sus métricas personales.
   * @param user Datos del usuario autenticado.
   * @returns Objeto con las métricas calculadas.
   */
  @Get('metricas')
  @Roles('employee', 'admin')
  obtenerMetricas(@CurrentUser() user: UserPayload) {
    return this.service.obtenerMetricasDashboard(user.id, user.role);
  }

  /**
   * Elimina una cotización del sistema.
   * @param id ID de la cotización a eliminar.
   * @param user Datos del usuario que solicita la eliminación.
   * @returns Resultado de la operación de eliminación.
   */
  @Delete('cotizaciones/:id')
  @Roles('employee', 'admin')
  eliminar(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.service.eliminar(id, user.id, user.role);
  }
}

// ======================================================
// 🌍 CONTROLADOR PÚBLICO (sin autenticación)
// ======================================================
/**
 * Controlador para acceso público.
 * Permite abrir cotizaciones mediante un slug único sin requerir autenticación.
 */
@Controller()
export class PublicController {
  constructor(private readonly service: CotizacionesService) { }

  /**
   * Abre una cotización específica utilizando su slug y registra la visita.
   * @param slug Identificador único amigable de la cotización.
   * @param req Objeto de la solicitud Express para capturar metadatos del visitante.
   * @throws NotFoundException si la cotización no existe.
   * @returns Información de la cotización y la visita iniciada.
   */
  @Get('c/:slug')
  async abrirPdf(@Param('slug') slug: string, @Req() req: Request) {
    const data = await this.service.abrirConTracking(slug, req);

    if (!data) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // ✅ Devolver JSON en lugar de HTML
    return {
      pdfUrl: data.pdfUrl,
      visitaId: data.visitaId,
      codigo: data.codigo,
      asesorNombre: data.asesorNombre,
    };
  }
}
