import { Global, Inject, Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { databaseProviders } from './database.providers';
import { PG_POOL } from './database.constants';
import { Pool } from 'pg';

@Global()
@Module({
    providers: [...databaseProviders],
    exports: [PG_POOL]
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(DatabaseModule.name);

    constructor(@Inject(PG_POOL) private readonly pool: Pool) { }

    async onModuleInit() {
        await this.pool.query('SELECT 1');
        this.logger.log('Conexión a PostgreSQL verificada');
    }

    async onApplicationShutdown() {
        await this.pool.end();
        this.logger.log('Pool de PostgreSQL cerrado');
    }
}
