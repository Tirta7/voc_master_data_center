import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ingredients')
export class Ingredient {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column()
    unit: string; // e.g., 'Kg', 'L', 'Gram', 'Ml'

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
    stockQuantity: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, default: 0, name: 'min_stock_level' })
    minStockLevel: number;

    @Column({ unique: true, nullable: true })
    sku: string;

    @Column({ nullable: true })
    category: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    costPrice: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    imageUrl: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
    yieldPercentage: number; // e.g., 80.00 for 80% usable

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    lastPurchasePrice: number;

    @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
    lastPurchaseQuantity: number;

    @Column({ nullable: true })
    lastPurchaseUnit: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
