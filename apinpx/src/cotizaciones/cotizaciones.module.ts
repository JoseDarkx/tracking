// cotizaciones.module.ts
import { Module } from '@nestjs/common';
import { CotizacionesController, PublicController } from './cotizaciones.controller';
import { CotizacionesService } from './cotizaciones.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    CotizacionesController, // rutas /api/*
    PublicController,       // rutas públicas /c/:slug
  ],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}