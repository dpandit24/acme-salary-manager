import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { parse_id } from '../../common/parse_id.pipe';
import { COMPENSATIONS_ROUTES } from './compensations.routes';
import { CompensationsService } from './compensations.service';
import { CompensationView } from './dto/compensation_view';
import { CorrectCompensationDto } from './dto/correct_compensation.dto';
import { CreateCompensationDto } from './dto/create_compensation.dto';

@Controller(COMPENSATIONS_ROUTES.base)
export class CompensationsController {
  constructor(private readonly compensations_service: CompensationsService) {}

  @Post()
  create(@Param('id', parse_id()) employee_id: string, @Body() dto: CreateCompensationDto): Promise<CompensationView> {
    return this.compensations_service.create(employee_id, dto);
  }

  @Patch(COMPENSATIONS_ROUTES.by_id)
  correct(
    @Param('id', parse_id()) employee_id: string,
    @Param('compensation_id', parse_id()) compensation_id: string,
    @Body() dto: CorrectCompensationDto,
  ): Promise<CompensationView> {
    return this.compensations_service.correct(employee_id, compensation_id, dto);
  }
}
