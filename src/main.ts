import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import morgan from 'morgan';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AppLogger } from './common/logging/app-logger.service';

async function bootstrap() {
  // Validate DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL in your .env file');
    console.error('Format: libsql://<database-host>?authToken=<token>');
    process.exit(1);
  }
  
  // Log database connection info (masked for security)
  const maskedDbUrl = process.env.DATABASE_URL
    .replace(/authToken=[^&]+/i, 'authToken=****')
    .replace(/:([^:@/?]+)@/, ':****@');
  console.log('🔧 Database connection configured');
  console.log(`   Connection: ${maskedDbUrl.substring(0, 80)}${maskedDbUrl.length > 80 ? '...' : ''}`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The API runs behind nginx, so req.ip was the Docker bridge address
  // (::ffff:172.18.0.1) on every request and every audit-log entry recorded it
  // instead of the client. Trust the first hop only — the immediate proxy.
  app.set('trust proxy', 1);

  // Increase body size limits for file uploads
  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS - Support multiple origins (frontend + admin panel)
  // Admin panel is always allowed and never restricted
  const envOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];
  
  // Always include localhost:3000 and localhost:3002 for development
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:57814', 'https://smholdings.gr', 'https://lincanto.gr'];
  // ADMIN_URL may hold a comma-separated list like FRONTEND_URL does — the
  // production env carries three entries in one string.
  const adminUrls = (process.env.ADMIN_URL || 'http://localhost:3002')
    .split(',')
    .map(url => url.trim());
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins, ...adminUrls])];
  
  console.log(`🌐 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      if (isLocalhostOrigin) {
        return callback(null, true);
      }
      
      // Always allow the admin panel: the configured ADMIN_URL(s).
      if (adminUrls.includes(origin)) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Compress all responses
  app.use(compression());

  // Security - Configure helmet to work with CORS
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // Route every logger — including the ~12 `new Logger(X.name)` call sites —
  // through the channel logger: daily-rotated files under LOG_DIR plus stdout.
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);

  // Request log goes to the http channel file instead of raw stdout.
  app.use(
    morgan('combined', {
      stream: {
        write: (line: string) => appLogger.channel('http').info(line.trimEnd()),
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Serve static files from public directory
  app.use(express.static('public'));

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(appLogger));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // No Swagger: the API is consumed only by our own frontends; a public
  // /docs + /docs-json on api.smholdings.gr was a free endpoint/DTO map for
  // scanners. Removed rather than gated — nothing should depend on it.
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();


