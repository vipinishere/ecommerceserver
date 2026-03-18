import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonModule, StorageService, UtilsService } from '@Common';
import { appConfigFactory } from '@Config';
import { AppController } from './app.controller';
import { AppCacheInterceptor } from './app-cache.interceptor';
import { MetricsInterceptor, MetricsModule, MetricsService } from './metrics';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { RedisModule } from './redis';
import { CartModule } from './cart';
import { ReviewModule } from './review';
import { ProductModule } from './product/product.module';
import { WalletModule } from './wallet';
import { SellerModule } from './seller';
import { AddressModule } from './address/address.module';
import { AdminModule } from './admin';
import { UsersModule } from './users';
import { WishlistModule } from './wishlist';
import { WatchHistoryModule } from './watchhistory';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: (storageService: StorageService) => ({
        ...storageService.defaultMulterOptions,
      }),
      inject: [StorageService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (appConfig: ConfigType<typeof appConfigFactory>) => ({
        ttl: appConfig.cacheTtl,
      }),
      inject: [appConfigFactory.KEY],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    MetricsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    AdminModule,
    UsersModule,
    CartModule,
    ReviewModule,
    WalletModule,
    AddressModule,
    SellerModule,
    ProductModule,
    WishlistModule,
    WatchHistoryModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        utilsService: UtilsService,
        metricsService: MetricsService,
      ) => {
        if (utilsService.isMetricsEnabled()) {
          return new MetricsInterceptor(metricsService);
        }
      },
      inject: [UtilsService, MetricsService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AppCacheInterceptor,
    },
  ],
})
export class AppModule {}
