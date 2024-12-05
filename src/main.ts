import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: '*', // 모든 출처 허용 (운영 환경에서는 특정 도메인만 허용하도록 설정)
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('API Documentation') // 문서 제목
    .setDescription('API endpoints for the project') // 문서 설명
    .setVersion('1.0') // API 버전
    .addBearerAuth() // 인증 정보 추가 (JWT)
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI 경로 설정
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
