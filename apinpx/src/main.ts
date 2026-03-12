import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express'; // ✨ 1. Importamos esto de express

/**
 * Función de arranque de la aplicación NestJS.
 * Configura CORS, límites de carga de archivos y el puerto de escucha.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👉 Habilitar CORS para local y para producción
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://surcompanycotizaciones.pages.dev' // URL de tu frontend en cloudflare
    ],
    credentials: true,
  });

  // ✨ 2. EL TRUCO: Aumentar el límite de peso a 50 Megabytes
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 👉 Escuchar en el puerto que asigne Render o el 3000 por defecto
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();