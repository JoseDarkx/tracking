import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Param,
  NotFoundException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CotizacionesService } from './cotizaciones.service';
import type { Request, Response } from 'express';

@Controller()
export class CotizacionesController {
  constructor(private readonly service: CotizacionesService) {}

  // 🔒 INTERNO → DASHBOARD
  @Get('cotizaciones')
  listar() {
    return this.service.listar();
  }

  // 🔒 INTERNO → CREAR
  @Post('cotizaciones')
  @UseInterceptors(FileInterceptor('pdf'))
  crear(
    @UploadedFile() pdf: Express.Multer.File,
    @Body('codigo') codigo: string,
  ) {
    return this.service.crear(codigo, pdf);
  }

  // 🌍 PÚBLICO → LINK TRACKED
  @Get('c/:slug')
  async abrirPdf(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const data = await this.service.abrirConTracking(slug, req);

    if (!data) {
      throw new NotFoundException('Cotización no encontrada');
    }

    res.setHeader('Content-Type', 'text/html');

    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Cotización</title>
</head>
<body style="margin:0">
  <iframe 
    src="${data.pdfUrl}" 
    style="width:100vw;height:100vh;border:none">
  </iframe>
</body>
</html>
    `);
  }

  @Get('dashboard/metrics')
    obtenerMetricas() {
  return this.service.obtenerMetricasDashboard();
}

}
