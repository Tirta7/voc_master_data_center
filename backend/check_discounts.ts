

import { DataSource } from 'typeorm';
import { Transaction } from './src/transaction/entities/transaction.entity';
import { OrderItem } from './src/cafe/entities/order-item.entity';
import { MemberTier } from './src/member/entities/member-tier.entity';
import { Member } from './src/member/entities/member.entity';
import { MenuItem } from './src/cafe/entities/menu-item.entity';
import { Category } from './src/cafe/entities/category.entity';

import * as path from 'path';

async function checkData() {
    const AppDataSource = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 4538,
        username: 'postgres',
        password: '1',
        database: 'billiard_db',
        entities: [path.join(__dirname, 'src/**/*.entity.ts')],
        synchronize: false,
    });

    try {
        console.log('Connecting to DB on 127.0.0.1:4538...');
        await AppDataSource.initialize();
        console.log('Data Source has been initialized!');

        const invoiceNo = 'TAB-260302181951';
        const tx = await AppDataSource.getRepository(Transaction).findOne({
            where: { invoiceNumber: invoiceNo },
            relations: ['member', 'member.tier', 'orderItems', 'orderItems.menuItem', 'orderItems.menuItem.category']
        });

        if (!tx) {
            console.log('Transaction not found for:', invoiceNo);
            await AppDataSource.destroy();
            return;
        }

        console.log('--- Transaction Info ---');
        console.log('ID:', tx.id);
        console.log('Invoice:', tx.invoiceNumber);
        console.log('Member:', tx.member?.name, 'Tier:', tx.member?.tier?.name);
        console.log('Tier Discount Config:', JSON.stringify(tx.member?.tier?.discountConfig, null, 2));

        console.log('\n--- Order Items ---');
        if (tx.orderItems && tx.orderItems.length > 0) {
            tx.orderItems.forEach((item: OrderItem) => {
                console.log(`Item: ${item.menuItem?.name} (Cat: ${item.menuItem?.category?.name})`);
                console.log(`  Qty: ${item.quantity}, Price: ${item.priceAtOrder}`);
                console.log(`  Discount: ${item.discountAmount} (${item.discountPercentage}%)`);
            });
        } else {
            console.log('No order items found.');
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();

