import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrinterService } from './printer.service';
import { Printer } from './entities/printer.entity';

@Controller('settings/printers')
@UseGuards(AuthGuard('jwt'))
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Get()
  async findAll(): Promise<Printer[]> {
    return this.printerService.findAll();
  }

  @Post()
  async create(@Body() data: Partial<Printer>): Promise<Printer> {
    return this.printerService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Printer>,
  ): Promise<Printer> {
    return this.printerService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.printerService.remove(id);
  }

  @Post(':id/test')
  async testPrint(@Param('id', ParseIntPipe) id: number) {
    const success = await this.printerService.testPrint(id);
    return { success };
  }
}
