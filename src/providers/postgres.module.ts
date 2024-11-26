import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
	imports: [
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (
				configService: ConfigService,
			): TypeOrmModuleOptions => {
				return {
					type: 'postgres',
					host: configService.getOrThrow('POSTGRES_HOST'),
					port: Number(configService.getOrThrow('POSTGRES_PORT')),
					username: configService.getOrThrow('POSTGRES_USER'),
					password: configService.getOrThrow('POSTGRES_PASSWORD'),
					database: configService.getOrThrow('POSTGRES_DB'),
					autoLoadEntities: true,
					synchronize: true,
					useUTC: true,
					poolSize: 20,
					entities: [],
					poolErrorHandler(err) {
						console.error(err);
					},
				};
			},
		}),
	],
})
export class PostgresModule {}
