import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './middleware/all-exceptions.filter';
import { TransformInterceptor } from './middleware/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  // Security
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DSU CareerBridge API')
    .setDescription(
      'AI-powered campus placement platform API for DSU CareerBridge.\n\n' +
      '## Authentication\nUse Bearer JWT token. Obtain via POST /api/v1/auth/login\n\n' +
      '## Roles\n- **STUDENT**: profile, resume, applications\n' +
      '- **ADMIN**: full dashboard access\n- **RECRUITER**: jobs, JD upload, shortlisting',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Students', 'Student profile management')
    .addTag('Resumes', 'Resume upload, generation, enhancement, tailoring')
    .addTag('Skills', 'Skill taxonomy & extraction')
    .addTag('Companies', 'Company profiles')
    .addTag('Jobs', 'Job postings & JD management')
    .addTag('Matching', 'AI-powered skill matching engine')
    .addTag('Admin', 'Placement cell admin operations')
    .addTag('Files', 'File upload & management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Increase HTTP server timeouts for long-running AI operations (resume tailor/generate)
  const httpServer = app.getHttpServer();
  httpServer.requestTimeout = 120000;  // 2 min
  httpServer.keepAliveTimeout = 125000; // slightly above requestTimeout

  await app.listen(port);
  console.log(`\n🚀 DSU CareerBridge API running at: http://localhost:${port}/${apiPrefix}`);
  console.log(`📖 Swagger docs at: http://localhost:${port}/api/docs\n`);
}

bootstrap();
