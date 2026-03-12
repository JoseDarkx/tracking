import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CotizacionesModule } from './cotizaciones/cotizaciones.module';
import { AuthModule } from './auth/auth.module';
import { TrackingModule } from './tracking/tracking.module';

/**
 * Módulo raíz de la aplicación que integra todos los módulos, controladores y proveedores.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    CotizacionesModule,
    TrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
