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

@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard) // 👈 Proteger todas las rutas
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) {}

  // ======================================================
  // 🔒 RUTAS PARA ADMINISTRADORES
  // ======================================================

  // 📊 Obtener todas las cotizaciones (SOLO ADMIN)
  @Get('admin/cotizaciones')
  @Roles('admin')
  listarTodasParaAdmin(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.service.listarTodasParaAdmin(parseInt(page), parseInt(limit));
  }

  // 👤 Obtener cotizaciones de un empleado específico (SOLO ADMIN)
  @Get('admin/cotizaciones/empleado/:empleadoId')
  @Roles('admin')
  listarPorEmpleado(
    @Param('empleadoId') empleadoId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.service.listarPorEmpleado(empleadoId, parseInt(page), parseInt(limit));
  }

  // 📊 Estadísticas globales (SOLO ADMIN)
  @Get('admin/estadisticas')
  @Roles('admin')
  obtenerEstadisticasGlobales() {
    return this.service.obtenerEstadisticasGlobales();
  }

  // ======================================================
  // 🔒 RUTAS PARA EMPLEADOS (y admins también pueden acceder)
  // ======================================================

  // 📄 Listar mis cotizaciones (o todas si soy admin)
  @Get('cotizaciones')
  @Roles('employee', 'admin')
  listar(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.listar(
      parseInt(page),
      parseInt(limit),
      user.id,
      user.role,
    );
  }

  // 📤 Crear nueva cotización
  @Post('cotizaciones')
  @Roles('employee', 'admin')
  @UseInterceptors(FileInterceptor('pdf'))
  crear(
    @UploadedFile() pdf: Express.Multer.File,
    @Body('codigo') codigo: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.crear(codigo, pdf, user.id);
  }

  // 🔍 Obtener detalle de una cotización
  @Get('cotizaciones/:id')
  @Roles('employee', 'admin')
  obtenerPorId(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.service.obtenerPorId(id, user.id, user.role);
  }

  // 📊 Mis métricas (o globales si soy admin)
  @Get('metricas')
  @Roles('employee', 'admin')
  obtenerMetricas(@CurrentUser() user: UserPayload) {
    return this.service.obtenerMetricasDashboard(user.id, user.role);
  }

  // 🗑️ Eliminar cotización
  @Delete('cotizaciones/:id')
  @Roles('employee', 'admin')
  eliminar(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.service.eliminar(id, user.id, user.role);
  }
}

// ======================================================
// 🌍 CONTROLADOR PÚBLICO (sin autenticación)
// ======================================================
@Controller()
export class PublicController {
  constructor(private readonly service: CotizacionesService) {}

  @Get('c/:slug')
  async abrirPdf(
    @Param('slug') slug: string,
    @Req() req: Request,
  ) {
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
