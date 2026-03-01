import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense, ExpenseCategory } from './entities/expense.entity';
import { Cashflow, CashflowType } from './entities/cashflow.entity';

import { BilliardGateway } from '../socket/billiard.gateway';

@Injectable()
export class FinanceService {
    constructor(
        @InjectRepository(Expense)
        private readonly expenseRepository: Repository<Expense>,
        @InjectRepository(Cashflow)
        private readonly cashflowRepository: Repository<Cashflow>,
        private readonly billiardGateway: BilliardGateway,
    ) { }

    async recordExpense(data: {
        amount: number;
        category: ExpenseCategory;
        description: string;
        recordedBy: string;
        shiftId?: number;
    }): Promise<Expense> {
        const expense = this.expenseRepository.create(data);
        const savedExpense = await this.expenseRepository.save(expense);

        await this.logCashflow({
            amount: data.amount,
            type: CashflowType.OUT,
            source: 'expense',
            referenceId: savedExpense.id.toString(),
            description: data.description,
        });

        return savedExpense;
    }

    async logCashflow(data: {
        amount: number;
        type: CashflowType;
        source: string;
        referenceId?: string;
        description?: string;
    }): Promise<Cashflow> {
        // Calculate current balance
        const lastEntry = await this.cashflowRepository.findOne({
            where: {},
            order: { id: 'DESC' },
        });
        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;

        const balanceAfter = data.type === CashflowType.IN
            ? currentBalance + Number(data.amount)
            : currentBalance - Number(data.amount);

        const cashflow = this.cashflowRepository.create({
            ...data,
            balanceAfter,
        });
        const saved = await this.cashflowRepository.save(cashflow);
        this.billiardGateway.broadcastFinanceUpdate(saved);
        return saved;
    }

    async getLedger(limit = 50) {
        return this.cashflowRepository.find({
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }

    async getExpenseHistory() {
        return this.expenseRepository.find({
            order: { date: 'DESC' },
        });
    }

    async getNetProfit(startDate: Date, endDate: Date) {
        const incomes = await this.cashflowRepository.find({
            where: {
                type: CashflowType.IN,
                timestamp: Between(startDate, endDate)
            },
        });
        const expenses = await this.cashflowRepository.find({
            where: {
                type: CashflowType.OUT,
                timestamp: Between(startDate, endDate)
            },
        });

        const totalIn = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalOut = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

        return {
            totalIn,
            totalOut,
            netProfit: totalIn - totalOut,
        };
    }
}
