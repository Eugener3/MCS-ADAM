import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const httpsOptions =
    process.env.SSL === 'true'
      ? {
          key: readFileSync(join(process.cwd(), '/certificates/localhost.key')),
          cert: readFileSync(
            join(process.cwd(), '/certificates/localhost.crt'),
          ),
        }
      : undefined;

  const app = await NestFactory.create(AppModule, { httpsOptions });
  app.useGlobalPipes(new ValidationPipe());
  SwaggerModule.setup(
    '/api/docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('HTTP routes')
        .setDescription('This server process all requests.')
        .setVersion('0.0.1')
        .addBearerAuth(
          {
            description: `Please enter token in following format: Bearer <JWT>`,
            name: 'Authorization',
            bearerFormat: 'Bearer',
            scheme: 'Bearer',
            type: 'http',
            in: 'Header',
          },
          'access-token',
        )
        .setContact(
          'Author contact',
          'https://t.me/E_Sora',
          'sora.eugener@gmail.com',
        )
        .build(),
    ),
    {
      customSiteTitle: 'HTTP minecraft routes',
      swaggerOptions: {
        filter: true,
        tagsSorter: 'alpha',
        tryItOutEnabled: true,
        persistAuthorization: true,
      },
    },
  );

  await app.listen(String(process.env.PORT), () =>
    console.log('> Started on', process.env.PORT),
  );
}
bootstrap();
