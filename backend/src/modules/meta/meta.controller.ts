import { Controller, Get } from '@nestjs/common';
import { META_ROUTES } from './meta.routes';
import { Meta, MetaService } from './meta.service';

@Controller(META_ROUTES.base)
export class MetaController {
  constructor(private readonly meta_service: MetaService) {}

  @Get()
  get(): Promise<Meta> {
    return this.meta_service.get_meta();
  }
}
