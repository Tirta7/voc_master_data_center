import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetCategory } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(AssetCategory)
    private categoryRepo: Repository<AssetCategory>,
  ) {}

  async create(data: Partial<AssetCategory>) {
    try {
      const newCat = this.categoryRepo.create(data);
      return await this.categoryRepo.save(newCat);
    } catch (error: any) {
      if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
        throw new ConflictException(`Kategori dengan nama "${data.name}" sudah ada.`);
      }
      throw error;
    }
  }

  findAll() {
    return this.categoryRepo.find();
  }

  async findOne(id: number) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    return cat;
  }

  async update(id: number, data: Partial<AssetCategory>) {
    const cat = await this.findOne(id);
    Object.assign(cat, data);
    try {
      return await this.categoryRepo.save(cat);
    } catch (error: any) {
      if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
        throw new ConflictException(`Kategori dengan nama "${data.name || cat.name}" sudah ada.`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    const cat = await this.findOne(id);
    return this.categoryRepo.remove(cat);
  }
}
