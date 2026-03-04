import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
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
        businessDayId?: number;
    }): Promise<Expense> {
        const expense = this.expenseRepository.create(data);
        const savedExpense = await this.expenseRepository.save(expense);

        await this.logCashflow({
            amount: data.amount,
            type: CashflowType.OUT,
            source: 'expense',
            referenceId: savedExpense.id.toString(),
            description: data.description,
            businessDayId: data.businessDayId,
            shiftId: data.shiftId,
        });

        return savedExpense;
    }

    // ── Update Expense ──────────────────────────────────────────────────────
    async updateExpense(id: number, data: {
        amount?: number;
        category?: ExpenseCategory;
        description?: string;
        recordedBy?: string;
    }): Promise<Expense> {
        const expense = await this.expenseRepository.findOne({ where: { id } });
        if (!expense) throw new NotFoundException(`Expense #${id} not found`);

        Object.assign(expense, data);
        return this.expenseRepository.save(expense);
    }

    // ── Delete Expense ──────────────────────────────────────────────────────
    async deleteExpense(id: number): Promise<{ deleted: boolean }> {
        const expense = await this.expenseRepository.findOne({ where: { id } });
        if (!expense) throw new NotFoundException(`Expense #${id} not found`);

        // Reverse the cashflow entry by adding the amount back in
        await this.logCashflow({
            amount: Number(expense.amount),
            type: CashflowType.IN,
            source: 'expense_reversal',
            referenceId: id.toString(),
            description: `Reversal: ${expense.description}`,
            businessDayId: expense.businessDayId,
            shiftId: expense.shiftId,
        });

        await this.expenseRepository.remove(expense);
        return { deleted: true };
    }

    async logCashflow(data: {
        amount: number;
        type: CashflowType;
        source: string;
        referenceId?: string;
        description?: string;
        businessDayId?: number;
        shiftId?: number;
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

    // ── Get Expense History (with optional filters) ─────────────────────────
    async getExpenseHistory(filters?: {
        startDate?: string;
        endDate?: string;
        category?: string;
    }) {
        const where: any = {};

        if (filters?.startDate && filters?.endDate) {
            where.date = Between(new Date(filters.startDate), new Date(filters.endDate + 'T23:59:59'));
        } else if (filters?.startDate) {
            where.date = MoreThanOrEqual(new Date(filters.startDate));
        } else if (filters?.endDate) {
            where.date = LessThanOrEqual(new Date(filters.endDate + 'T23:59:59'));
        }

        if (filters?.category && filters.category !== 'all') {
            where.category = filters.category;
        }

        return this.expenseRepository.find({
            where,
            order: { date: 'DESC' },
        });
    }

    // ── Expense Summary with Net Profit ──────────────────────────────────────
    async getExpenseSummary(startDate?: string, endDate?: string) {
        // Build date range (default: current month)
        const now = new Date();
        const start = startDate
            ? new Date(startDate)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        const end = endDate
            ? new Date(endDate + 'T23:59:59')
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get expenses in period
        const expenses = await this.expenseRepository.find({
            where: { date: Between(start, end) },
        });

        const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

        // Category breakdown
        const byCategory: Record<string, number> = {};
        for (const exp of expenses) {
            byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount);
        }

        // Get revenue (cashflow IN) in same period
        const incomes = await this.cashflowRepository.find({
            where: {
                type: CashflowType.IN,
                timestamp: Between(start, end),
            },
        });
        // Exclude expense_reversal from revenue count
        const totalRevenue = incomes
            .filter(i => i.source !== 'expense_reversal')
            .reduce((s, i) => s + Number(i.amount), 0);

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            byCategory,
            expenseCount: expenses.length,
            period: { start: start.toISOString(), end: end.toISOString() },
        };
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
