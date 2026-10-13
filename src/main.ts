import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://fergana-roses.vercel.app',
    'https://fergana-roses-production.up.railway.app',
  ];

  const extraOrigins = (process.env.FRONTEND_URLS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

  // Vercel issues a unique preview URL per deployment
  // (e.g. https://fergana-roses-frontend-abc123.vercel.app).
  // Allow them all for this project's frontend; production domain stays explicit above.
  const vercelPreviewPattern =
    /^https:\/\/fergana-roses-frontend(-[a-z0-9-]+)?\.vercel\.app$/;

  const allowedHeaders = [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Cache-Control',
    'Pragma',
  ];

  // app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        vercelPreviewPattern.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders,
    optionsSuccessStatus: 204,
  });

  // Ensure images directory exists
  const staticPath = join(__dirname, '..', 'public');
  const imagesPath = join(staticPath, 'images');

  if (!existsSync(imagesPath)) {
    try {
      mkdirSync(imagesPath, { recursive: true });
    } catch (error) {
      console.error(error);
    }
  }

  // Serve static files before setting global prefix
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
