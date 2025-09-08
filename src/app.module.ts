import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PropertyModule } from './property/property.module';
import { TourModule } from './tour/tour.module';
import { GisModule } from './gis/gis.module';
import { NotificationModule } from './notification/notification.module';
import { VerificationModule } from './verification/verification.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UserModule,
    PropertyModule,
    TourModule,
    GisModule,
    NotificationModule,
    VerificationModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}