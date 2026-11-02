import 'reflect-metadata';
import { Controller, Get, Inject, Module, Req, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { stage } from '@eas/shared';
import {
  createCatalogRuntime,
  type CatalogOptions,
  type CatalogRuntime,
} from './catalog/runtime.js';

@Controller()
class HealthController {
  constructor(
    @Inject('CATALOG_STATE') private readonly state: { runtime: CatalogRuntime | undefined },
  ) {}
  @Get('healthz')
  health() {
    return { status: 'ok', service: 'platform-api', stage: this.state.runtime ? 'catalog' : stage };
  }

  @Get('readyz')
  async ready(@Req() request: { id: string }) {
    if (!this.state.runtime)
      throw new ServiceUnavailableException({
        error: {
          code: 'STAGE00_EXECUTION_DISABLED',
          message: 'Business execution is disabled in stage 00.',
          requestId: request.id,
        },
      });
    try {
      await this.state.runtime.ready();
      return this.health();
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'DEPENDENCY_UNAVAILABLE',
          message: 'Catalog dependency unavailable',
          requestId: request.id,
        },
      });
    }
  }
}

export async function createApp(options?: CatalogOptions): Promise<NestFastifyApplication> {
  const runtime = options ? await createCatalogRuntime(options) : undefined;
  @Module({
    controllers: [HealthController],
    providers: [{ provide: 'CATALOG_STATE', useValue: { runtime } }],
  })
  class AppModule {}
  const adapter = new FastifyAdapter({
    bodyLimit: 8_388_608,
    trustProxy: false,
    ...(options?.apiTls
      ? { https: { ...options.apiTls, requestCert: true, rejectUnauthorized: false } }
      : {}),
  });
  adapter.getInstance().addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Request-Id', request.id);
    return payload;
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: false,
  });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  if (runtime) {
    await runtime.registerRoutes(adapter.getInstance());
    adapter.getInstance().addHook('onClose', async () => runtime.close());
  }
  await app.init();
  if (runtime) await runtime.start();
  return app;
}
