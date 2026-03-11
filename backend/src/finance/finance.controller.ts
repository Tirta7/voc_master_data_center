import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ExpenseCategory } from './entities/expense.entity';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  async recordExpense(
    @Body()
    data: {
      amount: number;
      category: ExpenseCategory;
      description: string;
      recordedBy: string;
      shiftId?: number;
    },
  ) {
    return this.financeService.recordExpense(data);
  }

  @Get('expenses/summary')
  async getExpenseSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getExpenseSummary(startDate, endDate);
  }

  @Get('expenses')
  async getExpenseHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
  ) {
    return this.financeService.getExpenseHistory({
      startDate,
      endDate,
      category,
    });
  }

  @Patch('expenses/:id')
  async updateExpense(
    @Param('id') id: string,
    @Body()
    data: {
      amount?: number;
      category?: ExpenseCategory;
      description?: string;
      recordedBy?: string;
    },
  ) {
    return this.financeService.updateExpense(Number(id), data);
  }

  @Delete('expenses/:id')
  async deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(Number(id));
  }

  @Get('ledger')
  async getLedger(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getLedger(limit, startDate, endDate);
  }

  @Get('profit')
  async getNetProfit(@Query('start') start: string, @Query('end') end: string) {
    return this.financeService.getNetProfit(new Date(start), new Date(end));
  }

  @Get('loyalty-analytics')
  async getLoyaltyAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getLoyaltyAnalytics(startDate, endDate);
  }
}
