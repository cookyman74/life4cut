import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 활성화
  app.enableCors({
    origin: '*', // 모든 출처 허용 (운영 환경에서는 특정 도메인만 허용하도록 설정)
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
