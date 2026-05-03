import { createConnection } from 'typeorm';
import { Ingredient } from './backend/src/inventory/entities/ingredient.entity';
import { MenuItem } from './backend/src/cafe/entities/menu-item.entity';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

async function checkBarItems() {
    try {
        const connection = await createConnection({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || '1',
            database: process.env.DB_DATABASE || 'billiard_db',
            entities: [Ingredient, MenuItem],
            synchronize: false,
        });

        const ingredients = await connection.getRepository(Ingredient).find();
        console.log('--- Ingredients ---');
        ingredients.forEach(i => {
            console.log(`Name: ${i.name}, Dept: ${i.department}, Mandatory: ${i.isMandatoryReporting}`);
        });

        const menuItems = await connection.getRepository(MenuItem).find();
        console.log('\n--- Menu Items ---');
        menuItems.forEach(m => {
            console.log(`Name: ${m.name}, Dept: ${m.department}, Mandatory: ${m.isMandatoryReporting}`);
        });

        await connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkBarItems();
