import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👉 Habilitar CORS para local y para producción
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://surcompanycotizaciones.pages.dev' // URL de tu frontend en cloudflare
    ],
    credentials: true,
  });

  // 👉 Escuchar en el puerto que asigne Render o el 3000 por defecto
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();