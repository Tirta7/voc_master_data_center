import { DataSource } from 'typeorm';
import * as path from 'path';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 4538,
    username: 'postgres',
    password: '1',
    database: 'billiard_db',
    entities: [path.join(__dirname, 'src/**/*.entity.ts')]
});

async function runSeed() {
    try {
        console.log('Connecting to DB for Dummy Data Seeding...');
        await AppDataSource.initialize();

        // 1. Seed Packages
        console.log('Creating Packages...');
        await AppDataSource.query(`
            INSERT INTO "billiard_packages" (name, "description", "price", "durationInMinutes", "isActive", "createdAt", "updatedAt") 
            VALUES ('Paket Hemat 2 Jam', 'Bermain 2 Jam', 40000, 120, true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);
        await AppDataSource.query(`
            INSERT INTO "billiard_packages" (name, "description", "price", "durationInMinutes", "isActive", "createdAt", "updatedAt") 
            VALUES ('Paket Puas 3 Jam', 'Bermain 3 Jam', 55000, 180, true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        `);

        // 2. Seed Default Settings
        console.log('Seeding Global Settings (Billiard Rates, Tax, Waiter Name)...');
        await AppDataSource.query(`
            INSERT INTO "settings" ("key", "value", "description") VALUES ('businessName', 'VOC BILLIARD & CAFE', 'Nama Bisnis Utama') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('serviceChargePercentage', '10', 'Service Charge') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('ppnPercentage', '10', 'Pajak Pertambahan Nilai (PPN)') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('roundingKelipatan', '100', 'Pembulatan ke Atas/Bawah (Misal Rp. 100)') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('posWaitName', 'WEWE (SHIFT 1)', 'Nama Kasir Bawaan untuk Cetak') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('openTablePrice', '25000', 'Harga Reguler Per Jam') ON CONFLICT DO NOTHING;
            INSERT INTO "settings" ("key", "value", "description") VALUES ('minimumBillableDurationMinutes', '60', 'Minimum Waktu Billing Billiard (Menit)') ON CONFLICT DO NOTHING;
        `);

        // 3. Seed Cafe Categories
        console.log('Creating Cafe Categories...');
        const foodCatRes = await AppDataSource.query(`
            INSERT INTO "menu_categories" (name, "description", "isActive", "createdAt", "updatedAt") 
            VALUES ('FOOD', 'Makanan Berat', true, NOW(), NOW()) RETURNING id;
        `);
        const foodCatId = foodCatRes[0]?.id || 1;

        const drinkCatRes = await AppDataSource.query(`
            INSERT INTO "menu_categories" (name, "description", "isActive", "createdAt", "updatedAt") 
            VALUES ('DRINK', 'Minuman Segar', true, NOW(), NOW()) RETURNING id;
        `);
        const drinkCatId = drinkCatRes[0]?.id || 2;

        const snackCatRes = await AppDataSource.query(`
            INSERT INTO "menu_categories" (name, "description", "isActive", "createdAt", "updatedAt") 
            VALUES ('SNACK', 'Cemilan/Rokok', true, NOW(), NOW()) RETURNING id;
        `);
        const snackCatId = snackCatRes[0]?.id || 3;

        // 4. Seed Cafe Items
        console.log('Creating Cafe Menus...');
        await AppDataSource.query(`
            INSERT INTO "menu_items" (name, "description", price, status, "categoryId", "stockType", stock, "createdAt", "updatedAt") 
            VALUES ('Nasi Goreng Spesial', 'Nasi Goreng + Telur + Sosis', 25000, 'AVAILABLE', $1, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Indomie Rebus Telur', 'Indomie Rebus + Telur', 15000, 'AVAILABLE', $1, 'PRODUCTION', 0, NOW(), NOW()),
                   ('French Fries', 'Kentang Goreng', 20000, 'AVAILABLE', $3, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Mendoan Anget', 'Tempe Mendoan (Isi 4)', 18000, 'AVAILABLE', $3, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Kopi Hitam (Tubruk)', 'Kopi Hitam', 10000, 'AVAILABLE', $2, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Ice Lemon Tea', 'Es Lemon Tea', 15000, 'AVAILABLE', $2, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Soda Gembira', 'Fanta Susu', 20000, 'AVAILABLE', $2, 'PRODUCTION', 0, NOW(), NOW()),
                   ('Air Mineral 600ml', 'Air Mineral Botol', 6000, 'AVAILABLE', $2, 'STOCKABLE', 50, NOW(), NOW())
        `, [foodCatId, drinkCatId, snackCatId]);

        // 5. Seed Member Tiers
        console.log('Creating Member Tiers...');
        const platRes = await AppDataSource.query(`
            INSERT INTO "member_tiers" (name, "discountConfig", "activeStartTime", "activeEndTime", "pointMultiplier", "isActive", "createdAt", "updatedAt") 
            VALUES ('PLATINUM', '{"billiardPackage": 20, "billiardOpen": 20, "food": 20, "drink": 20, "other": 20, "isFreeLocker": true}', '00:00', '23:59', 2, true, NOW(), NOW()) RETURNING id;
        `);
        const platId = platRes[0]?.id || 1;

        const goldRes = await AppDataSource.query(`
            INSERT INTO "member_tiers" (name, "discountConfig", "activeStartTime", "activeEndTime", "pointMultiplier", "isActive", "createdAt", "updatedAt") 
            VALUES ('GOLD', '{"billiardPackage": 10, "billiardOpen": 10, "food": 10, "drink": 10, "other": 10, "isFreeLocker": false}', '00:00', '23:59', 1, true, NOW(), NOW()) RETURNING id;
        `);
        const goldId = goldRes[0]?.id || 2;

        // 6. Seed Members
        console.log('Creating Mock Members...');
        await AppDataSource.query(`
            INSERT INTO "members" ("memberCode", name, phone, email, "dateOfBirth", "registrationDate", "validUntil", balance, "tierId", "isActive", "createdAt", "updatedAt")
            VALUES ('VOC-2026-0001', 'Budi Santoso', '081234567890', 'budi@gmail.com', '1990-01-01', NOW(), NOW() + INTERVAL '1 year', 150000, $1, true, NOW(), NOW()),
                   ('VOC-2026-0002', 'Dian Smith', '089876543210', 'dian@gmail.com', '1995-05-05', NOW(), NOW() + INTERVAL '1 year', 50000, $2, true, NOW(), NOW());
        `, [platId, goldId]);

        console.log('========================================');
        console.log('SUCCESS! ALL DUMMY DATA HAS BEEN SEEDED.');
        console.log('========================================');
        process.exit(0);
    } catch (e) {
        console.error('Error Seeding Dummy Data:', e);
        process.exit(1);
    }
}

runSeed();
