
import { createConnection } from 'typeorm';
import { MenuItem } from './backend/src/cafe/entities/menu-item.entity';
import { Recipe } from './backend/src/inventory/entities/recipe.entity';
import { Ingredient } from './backend/src/inventory/entities/ingredient.entity';
import { Category } from './backend/src/cafe/entities/category.entity';

async function check() {
    const connection = await createConnection({
        type: 'sqlite',
        database: 'backend/database.sqlite', // Adjust if different
        entities: [MenuItem, Recipe, Ingredient, Category],
        synchronize: false,
    });

    const menuItems = await connection.getRepository(MenuItem).find({
        where: { name: 'DJARUM SUPER 12' },
        relations: ['category']
    });

    console.log('--- MENU ITEMS ---');
    console.log(JSON.stringify(menuItems, null, 2));

    for (const item of menuItems) {
        const recipes = await connection.getRepository(Recipe).find({
            where: { menuItemId: item.id },
            relations: ['ingredient']
        });
        console.log(`--- RECIPES FOR ${item.name} (ID: ${item.id}) ---`);
        console.log(JSON.stringify(recipes, null, 2));
    }

    const ingredients = await connection.getRepository(Ingredient).find({
        where: { name: 'DJARUM SUPER 12' }
    });
    console.log('--- INGREDIENTS ---');
    console.log(JSON.stringify(ingredients, null, 2));

    await connection.close();
}

check().catch(console.error);
