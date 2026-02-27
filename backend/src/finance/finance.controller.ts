import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { ExpenseCategory } from './entities/expense.entity';

@Controller('finance')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    @Post('expenses')
    async recordExpense(@Body() data: {
        amount: number;
        category: ExpenseCategory;
        description: string;
        recordedBy: string;
        shiftId?: number;
    }) {
        return this.financeService.recordExpense(data);
    }

    @Get('expenses')
    async getExpenseHistory() {
        return this.financeService.getExpenseHistory();
    }

    @Get('ledger')
    async getLedger(@Query('limit') limit?: number) {
        return this.financeService.getLedger(limit);
    }

    @Get('profit')
    async getNetProfit(@Query('start') start: string, @Query('end') end: string) {
        return this.financeService.getNetProfit(new Date(start), new Date(end));
    }
}
