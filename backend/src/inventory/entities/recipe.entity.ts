import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ingredient } from './ingredient.entity';

@Entity('recipes')
export class Recipe {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne('MenuItem', (menuItem: any) => menuItem.recipes)
    @JoinColumn({ name: 'menuItemId' })
    menuItem: any; // Avoid circular import — MenuItem imports Recipe

    @Column()
    menuItemId: number;

    @ManyToOne(() => Ingredient, { nullable: true })
    @JoinColumn({ name: 'ingredientId' })
    ingredient: Ingredient;

    @Column({ nullable: true })
    ingredientId: number;

    @ManyToOne('MenuItem', { nullable: true })
    @JoinColumn({ name: 'subMenuItemId' })
    subMenuItem: any; // For sub-recipes — same circular dep avoidance

    @Column({ nullable: true })
    subMenuItemId: number;

    @Column({ type: 'decimal', precision: 12, scale: 3 })
    quantity: number;

    @Column()
    unit: string;
}
