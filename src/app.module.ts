import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PropertyModule } from './property/property.module';
import { TourModule } from './tour/tour.module';
import { GisModule } from './gis/gis.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [AuthModule, UserModule, PropertyModule, TourModule, GisModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
