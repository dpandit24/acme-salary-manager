import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { parse_id } from '../../common/parse_id.pipe';
import { CreateEmployeeDto } from './dto/create_employee.dto';
import { AsOfQueryDto, ListEmployeesDto } from './dto/list_employees.dto';
import { UpdateEmployeeDto } from './dto/update_employee.dto';
import { EMPLOYEES_ROUTES } from './employees.routes';
import { EmployeeDetail, EmployeeList, EmployeesService } from './employees.service';

@Controller(EMPLOYEES_ROUTES.base)
export class EmployeesController {
  constructor(private readonly employees_service: EmployeesService) {}

  @Get()
  list(@Query() query: ListEmployeesDto): Promise<EmployeeList> {
    return this.employees_service.list(query);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeDetail> {
    return this.employees_service.create(dto);
  }

  @Get(EMPLOYEES_ROUTES.by_id)
  get(@Param('id', parse_id()) id: string, @Query() query: AsOfQueryDto): Promise<EmployeeDetail> {
    return this.employees_service.get_detail(id, query.as_of);
  }

  @Patch(EMPLOYEES_ROUTES.by_id)
  update(@Param('id', parse_id()) id: string, @Body() dto: UpdateEmployeeDto): Promise<EmployeeDetail> {
    return this.employees_service.update(id, dto);
  }
}
