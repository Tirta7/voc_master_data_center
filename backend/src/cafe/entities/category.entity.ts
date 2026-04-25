import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MenuItem } from './menu-item.entity';

export enum ProductionTarget {
  KITCHEN = 'KDS',
  BARTENDER = 'BDS',
  NONE = 'NONE',
}

export enum CategoryType {
  MENU = 'MENU',
  INGREDIENT = 'INGREDIENT',
  BOTH = 'BOTH',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: CategoryType,
    default: CategoryType.MENU,
  })
  type: CategoryType;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'KDS',
  })
  productionTarget: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  menuItems: MenuItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
