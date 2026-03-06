import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Recipe } from '../../inventory/entities/recipe.entity';
import { Category, ProductionTarget } from './category.entity';
import { ProductFinance } from './product-finance.entity';

@Entity('menu_items')
export class MenuItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @ManyToOne(() => Category, (category) => category.menuItems, { nullable: true })
    @JoinColumn({ name: 'categoryId' })
    category: Category;

    @Column({ nullable: true })
    categoryId: number;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
        comment: 'Override category production target if needed'
    })
    productionTarget: string;

    @Column({ type: 'date', nullable: true })
    expiryDate: Date;

    @Column({ unique: true, nullable: true })
    sku: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    imageUrl: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ default: true })
    isActive: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    taxPercentage: number;

    @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
    stockQuantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
    minStockLevel: number;

    @Column({ default: false })
    isSubRecipe: boolean; // If true, this item is an intermediate ingredient

    @OneToMany(() => Recipe, (recipe) => recipe.menuItem)
    recipes: Recipe[];

    @OneToOne('ProductFinance', 'menuItem', { cascade: true })
    productFinance: Relation<ProductFinance>;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
    yieldPercentage: number; // e.g., 80.00 for 80% usable

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
