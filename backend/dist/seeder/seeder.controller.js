"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SeederController", {
    enumerable: true,
    get: function() {
        return SeederController;
    }
});
const _common = require("@nestjs/common");
const _billiardservice = require("../billiard/billiard.service");
const _tableentity = require("../billiard/entities/table.entity");
const _inventoryservice = require("../inventory/inventory.service");
const _cafeservice = require("../cafe/cafe.service");
const _settingsservice = require("../settings/settings.service");
const _memberservice = require("../member/member.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let SeederController = class SeederController {
    async bulkSeed() {
        try {
            console.log('Starting MASTER BULK SEED...');
            await this.seedSettings();
            await this.seedTables();
            await this.seedPackages();
            await this.seedCafe();
            await this.seedMembers();
            return {
                message: 'MASTER BULK SEED for VOC BILLIARD completed successfully',
                summary: {
                    tables: 10,
                    packages: 'Regular/VIP Hourly & Fixed',
                    cafe: '100 Ingredients, 50 Menus',
                    members: 3
                }
            };
        } catch (error) {
            console.error('Master Bulk Seed Error:', error);
            return {
                error: true,
                message: error.message
            };
        }
    }
    async seedSettings() {
        return this.settingsService.updateSettings({
            businessName: 'VOC BILLIARD',
            address: 'Jakarta, Indonesia',
            contact: '0812-xxxx-xxxx',
            socialMediaLink: '@voc_billiard',
            ppnPercentage: 11,
            serviceChargePercentage: 5,
            roundingKelipatan: 100,
            businessDayOffset: '04:00'
        });
    }
    async seedMembers() {
        // Idempotent check
        const existing = await this.memberService.getAllMembers();
        if (existing.length > 0) return {
            message: 'Members already exist'
        };
        const m1 = await this.memberService.createMember({
            name: 'Budi Santoso',
            phone: '081122334455',
            balance: 1000000,
            rfidUid: 'CARD_001'
        });
        const m2 = await this.memberService.createMember({
            name: 'Siti Aminah',
            phone: '085566778899',
            balance: 500000,
            rfidUid: 'CARD_002'
        });
        const m3 = await this.memberService.createMember({
            name: 'Andi Wijaya',
            phone: '081234567891',
            balance: 0,
            rfidUid: 'CARD_003'
        });
        return [
            m1,
            m2,
            m3
        ];
    }
    async seedPackages() {
        const existing = await this.billiardService.getPackages();
        if (existing.length > 0) return {
            message: 'Packages already exist'
        };
        const packages = [
            {
                name: 'REGULAR HOURLY',
                categoryId: 1,
                type: 'hourly',
                price: 50000,
                minutePrice: 50000 / 60
            },
            {
                name: 'VIP HOURLY',
                categoryId: 2,
                type: 'hourly',
                price: 85000,
                minutePrice: 85000 / 60
            },
            {
                name: 'REGULAR 2 HOURS',
                categoryId: 1,
                type: 'fixed',
                durationMinutes: 120,
                price: 90000
            },
            {
                name: 'VIP 2 HOURS',
                categoryId: 2,
                type: 'fixed',
                durationMinutes: 120,
                price: 150000
            }
        ];
        const seeded = [];
        for (const p of packages){
            const result = await this.billiardService.createPackage(p);
            seeded.push(result);
        }
        return seeded;
    }
    async seedTables() {
        try {
            const existing = await this.billiardService.getAllTables();
            if (existing.length >= 10) return {
                message: 'Tables already exist'
            };
            const tables = [];
            for(let i = 1; i <= 10; i++){
                const isVip = i > 8; // 9 & 10 are VIP
                const table = await this.billiardService.createTable({
                    tableName: `Meja ${i}${isVip ? ' (VIP)' : ''}`,
                    macAddress: `ESP32_DEV_${i}`,
                    status: _tableentity.TableStatus.AVAILABLE,
                    isLightOn: false,
                    relayPin: 15 + i,
                    categoryId: isVip ? 2 : 1
                });
                tables.push(table);
            }
            return {
                message: 'Seeded 10 tables',
                tables
            };
        } catch (error) {
            console.error('Seed Tables Error:', error);
            throw error;
        }
    }
    async seedCafe() {
        try {
            // 1. Defined 100 Ingredients
            const ingredientsData = [
                // ... (I'll keep the list as is but fix the loop below)
                {
                    name: 'Beras Basmathi',
                    sku: 'IG-001',
                    category: 'Staple',
                    unit: 'Kg',
                    costPrice: 15000,
                    stockQuantity: 100,
                    minStock: 20,
                    yield: 95,
                    desc: 'Premium rice'
                },
                {
                    name: 'Beras Jasmine',
                    sku: 'IG-002',
                    category: 'Staple',
                    unit: 'Kg',
                    costPrice: 13000,
                    stockQuantity: 80,
                    minStock: 15,
                    yield: 95,
                    desc: 'Fragrant rice'
                },
                {
                    name: 'Mie Kuning',
                    sku: 'IG-003',
                    category: 'Staple',
                    unit: 'Pack',
                    costPrice: 5000,
                    stockQuantity: 50,
                    minStock: 10,
                    yield: 100,
                    desc: 'Yellow eggs noodle'
                },
                {
                    name: 'Pasta Spaghetti',
                    sku: 'IG-004',
                    category: 'Staple',
                    unit: 'Pack',
                    costPrice: 12000,
                    stockQuantity: 40,
                    minStock: 8,
                    yield: 100,
                    desc: 'Italian pasta'
                },
                {
                    name: 'Dada Ayam',
                    sku: 'IG-005',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 45000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 90,
                    desc: 'Fresh chicken breast'
                },
                {
                    name: 'Paha Ayam',
                    sku: 'IG-006',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 42000,
                    stockQuantity: 25,
                    minStock: 5,
                    yield: 85,
                    desc: 'Fresh chicken thigh'
                },
                {
                    name: 'Daging Sapi Sirloin',
                    sku: 'IG-007',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 120000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 80,
                    desc: 'Imported beef'
                },
                {
                    name: 'Daging Giling',
                    sku: 'IG-008',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 95000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 95,
                    desc: 'Ground beef'
                },
                {
                    name: 'Udang Fresh',
                    sku: 'IG-009',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 85000,
                    stockQuantity: 12,
                    minStock: 2,
                    yield: 70,
                    desc: 'Fresh sea shrimp'
                },
                {
                    name: 'Cumi-cumi',
                    sku: 'IG-010',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 75000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 65,
                    desc: 'Fresh squid'
                },
                {
                    name: 'Ikan Dori Fillet',
                    sku: 'IG-011',
                    category: 'Protein',
                    unit: 'Kg',
                    costPrice: 55000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 90,
                    desc: 'Dory fish fillet'
                },
                {
                    name: 'Telur Ayam',
                    sku: 'IG-012',
                    category: 'Protein',
                    unit: 'Butir',
                    costPrice: 2000,
                    stockQuantity: 300,
                    minStock: 50,
                    yield: 90,
                    desc: 'Fresh eggs'
                },
                {
                    name: 'Tahu Putih',
                    sku: 'IG-013',
                    category: 'Protein',
                    unit: 'Pcs',
                    costPrice: 1000,
                    stockQuantity: 100,
                    minStock: 20,
                    yield: 100,
                    desc: 'White tofu'
                },
                {
                    name: 'Tempe',
                    sku: 'IG-014',
                    category: 'Protein',
                    unit: 'Pcs',
                    costPrice: 5000,
                    stockQuantity: 40,
                    minStock: 10,
                    yield: 100,
                    desc: 'Soybean tempeh'
                },
                {
                    name: 'Kubis',
                    sku: 'IG-015',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 8000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 80,
                    desc: 'Cabbage'
                },
                {
                    name: 'Wortel',
                    sku: 'IG-016',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 12000,
                    stockQuantity: 12,
                    minStock: 2,
                    yield: 85,
                    desc: 'Carrot'
                },
                {
                    name: 'Brokoli',
                    sku: 'IG-017',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 25000,
                    stockQuantity: 8,
                    minStock: 2,
                    yield: 75,
                    desc: 'Broccoli'
                },
                {
                    name: 'Sawi Hijau',
                    sku: 'IG-018',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 10000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 80,
                    desc: 'Green mustard'
                },
                {
                    name: 'Kangkung',
                    sku: 'IG-019',
                    category: 'Vegetable',
                    unit: 'Ikat',
                    costPrice: 3000,
                    stockQuantity: 30,
                    minStock: 5,
                    yield: 70,
                    desc: 'Water spinach'
                },
                {
                    name: 'Timun',
                    sku: 'IG-020',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 7000,
                    stockQuantity: 20,
                    minStock: 3,
                    yield: 90,
                    desc: 'Cucumber'
                },
                {
                    name: 'Tomat',
                    sku: 'IG-021',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 15000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 95,
                    desc: 'Tomato'
                },
                {
                    name: 'Bawang Bombay',
                    sku: 'IG-022',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 35000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 90,
                    desc: 'Onion'
                },
                {
                    name: 'Bawang Merah',
                    sku: 'IG-023',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 40000,
                    stockQuantity: 12,
                    minStock: 2,
                    yield: 85,
                    desc: 'Shallot'
                },
                {
                    name: 'Bawang Putih',
                    sku: 'IG-024',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 35000,
                    stockQuantity: 15,
                    minStock: 2,
                    yield: 88,
                    desc: 'Garlic'
                },
                {
                    name: 'Cabai Merah',
                    sku: 'IG-025',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 45000,
                    stockQuantity: 8,
                    minStock: 2,
                    yield: 92,
                    desc: 'Red chili'
                },
                {
                    name: 'Cabai Rawit',
                    sku: 'IG-026',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 60000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 95,
                    desc: 'Bird eye chili'
                },
                {
                    name: 'Lada Putih Bubuk',
                    sku: 'IG-027',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 100,
                    stockQuantity: 2000,
                    minStock: 500,
                    yield: 100,
                    desc: 'White pepper'
                },
                {
                    name: 'Lada Hitam Bubuk',
                    sku: 'IG-028',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 150,
                    stockQuantity: 1500,
                    minStock: 300,
                    yield: 100,
                    desc: 'Black pepper'
                },
                {
                    name: 'Garam',
                    sku: 'IG-029',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 10,
                    stockQuantity: 10000,
                    minStock: 1000,
                    yield: 100,
                    desc: 'Salt'
                },
                {
                    name: 'Gula Pasir',
                    sku: 'IG-030',
                    category: 'Sweetener',
                    unit: 'Kg',
                    costPrice: 16000,
                    stockQuantity: 50,
                    minStock: 10,
                    yield: 100,
                    desc: 'Sugar'
                },
                {
                    name: 'Gula Aren',
                    sku: 'IG-031',
                    category: 'Sweetener',
                    unit: 'Liter',
                    costPrice: 45000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Palm sugar'
                },
                {
                    name: 'Biji Kopi Arabica',
                    sku: 'IG-032',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 250,
                    stockQuantity: 5000,
                    minStock: 1000,
                    yield: 100,
                    desc: 'Arabica coffee'
                },
                {
                    name: 'Biji Kopi Robusta',
                    sku: 'IG-033',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 150,
                    stockQuantity: 8000,
                    minStock: 1500,
                    yield: 100,
                    desc: 'Robusta coffee'
                },
                {
                    name: 'Teh Hijau Powder',
                    sku: 'IG-034',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 400,
                    stockQuantity: 2000,
                    minStock: 500,
                    yield: 100,
                    desc: 'Matcha powder'
                },
                {
                    name: 'Teh Hitam Celup',
                    sku: 'IG-035',
                    category: 'Beverage',
                    unit: 'Pack',
                    costPrice: 15000,
                    stockQuantity: 50,
                    minStock: 10,
                    yield: 100,
                    desc: 'Black tea'
                },
                {
                    name: 'Susu UHT',
                    sku: 'IG-036',
                    category: 'Dairy',
                    unit: 'Liter',
                    costPrice: 20000,
                    stockQuantity: 48,
                    minStock: 12,
                    yield: 100,
                    desc: 'Fresh milk'
                },
                {
                    name: 'Susu Kental Manis',
                    sku: 'IG-037',
                    category: 'Dairy',
                    unit: 'Can',
                    costPrice: 12000,
                    stockQuantity: 36,
                    minStock: 6,
                    yield: 100,
                    desc: 'Condensed milk'
                },
                {
                    name: 'Susu Evaporasi',
                    sku: 'IG-038',
                    category: 'Dairy',
                    unit: 'Can',
                    costPrice: 18000,
                    stockQuantity: 24,
                    minStock: 4,
                    yield: 100,
                    desc: 'Evaporated milk'
                },
                {
                    name: 'Keju Cheddar',
                    sku: 'IG-039',
                    category: 'Dairy',
                    unit: 'Pack',
                    costPrice: 25000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 100,
                    desc: 'Cheddar cheese'
                },
                {
                    name: 'Keju Mozzarella',
                    sku: 'IG-040',
                    category: 'Dairy',
                    unit: 'Pack',
                    costPrice: 45000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 100,
                    desc: 'Mozzarella'
                },
                {
                    name: 'Mentega',
                    sku: 'IG-041',
                    category: 'Oil',
                    unit: 'Gram',
                    costPrice: 50,
                    stockQuantity: 5000,
                    minStock: 1000,
                    yield: 100,
                    desc: 'Butter'
                },
                {
                    name: 'Minyak Kelapa',
                    sku: 'IG-042',
                    category: 'Oil',
                    unit: 'Liter',
                    costPrice: 18000,
                    stockQuantity: 60,
                    minStock: 10,
                    yield: 100,
                    desc: 'Cooking oil'
                },
                {
                    name: 'Minyak Zaitun',
                    sku: 'IG-043',
                    category: 'Oil',
                    unit: 'Liter',
                    costPrice: 95000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'Olive oil'
                },
                {
                    name: 'Kecap Manis',
                    sku: 'IG-044',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 25000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 100,
                    desc: 'Sweet soy sauce'
                },
                {
                    name: 'Kecap Asin',
                    sku: 'IG-045',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 20000,
                    stockQuantity: 12,
                    minStock: 3,
                    yield: 100,
                    desc: 'Salty soy sauce'
                },
                {
                    name: 'Saus Tiram',
                    sku: 'IG-046',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 45000,
                    stockQuantity: 8,
                    minStock: 2,
                    yield: 100,
                    desc: 'Oyster sauce'
                },
                {
                    name: 'Lemon Fresh',
                    sku: 'IG-047',
                    category: 'Fruit',
                    unit: 'Kg',
                    costPrice: 55000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 40,
                    desc: 'Fresh lemon'
                },
                {
                    name: 'Jeruk Peras',
                    sku: 'IG-048',
                    category: 'Fruit',
                    unit: 'Kg',
                    costPrice: 18000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 45,
                    desc: 'Fresh orange'
                },
                {
                    name: 'Alpukat',
                    sku: 'IG-049',
                    category: 'Fruit',
                    unit: 'Kg',
                    costPrice: 35000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 60,
                    desc: 'Avocado'
                },
                {
                    name: 'Stroberi',
                    sku: 'IG-050',
                    category: 'Fruit',
                    unit: 'Pack',
                    costPrice: 30000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 95,
                    desc: 'Strawberry'
                },
                {
                    name: 'Mangga',
                    sku: 'IG-051',
                    category: 'Fruit',
                    unit: 'Kg',
                    costPrice: 25000,
                    stockQuantity: 12,
                    minStock: 3,
                    yield: 70,
                    desc: 'Mango'
                },
                {
                    name: 'Cokelat Bubuk',
                    sku: 'IG-052',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 300,
                    stockQuantity: 2000,
                    minStock: 500,
                    yield: 100,
                    desc: 'Cocoa powder'
                },
                {
                    name: 'Sirup Vanila',
                    sku: 'IG-053',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 85000,
                    stockQuantity: 6,
                    minStock: 1,
                    yield: 100,
                    desc: 'Vanilla syrup'
                },
                {
                    name: 'Sirup Hazelnut',
                    sku: 'IG-054',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 85000,
                    stockQuantity: 6,
                    minStock: 1,
                    yield: 100,
                    desc: 'Hazelnut syrup'
                },
                {
                    name: 'Sirup Karamel',
                    sku: 'IG-055',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 85000,
                    stockQuantity: 6,
                    minStock: 1,
                    yield: 100,
                    desc: 'Caramel syrup'
                },
                {
                    name: 'Sirup Lychee',
                    sku: 'IG-056',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 65000,
                    stockQuantity: 6,
                    minStock: 1,
                    yield: 100,
                    desc: 'Lychee syrup'
                },
                {
                    name: 'Madu Murni',
                    sku: 'IG-057',
                    category: 'Sweetener',
                    unit: 'Liter',
                    costPrice: 150000,
                    stockQuantity: 4,
                    minStock: 1,
                    yield: 100,
                    desc: 'Pure honey'
                },
                {
                    name: 'Mayones',
                    sku: 'IG-058',
                    category: 'Sauce',
                    unit: 'Kg',
                    costPrice: 35000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Mayonnaise'
                },
                {
                    name: 'Saus Sambal',
                    sku: 'IG-059',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 18000,
                    stockQuantity: 24,
                    minStock: 5,
                    yield: 100,
                    desc: 'Chili sauce'
                },
                {
                    name: 'Saus Tomat',
                    sku: 'IG-060',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 15000,
                    stockQuantity: 24,
                    minStock: 5,
                    yield: 100,
                    desc: 'Tomato sauce'
                },
                {
                    name: 'Sosis Sapi',
                    sku: 'IG-061',
                    category: 'Processed',
                    unit: 'Pack',
                    costPrice: 45000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 100,
                    desc: 'Beef sausage'
                },
                {
                    name: 'Nugget Ayam',
                    sku: 'IG-062',
                    category: 'Processed',
                    unit: 'Pack',
                    costPrice: 40000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 100,
                    desc: 'Chicken nuggets'
                },
                {
                    name: 'Kentang Goreng Beku',
                    sku: 'IG-063',
                    category: 'Processed',
                    unit: 'Kg',
                    costPrice: 35000,
                    stockQuantity: 30,
                    minStock: 10,
                    yield: 95,
                    desc: 'Frozen french fries'
                },
                {
                    name: 'Dampling Mix',
                    sku: 'IG-064',
                    category: 'Processed',
                    unit: 'Pack',
                    costPrice: 55000,
                    stockQuantity: 15,
                    minStock: 3,
                    yield: 100,
                    desc: 'Mixed dimsum'
                },
                {
                    name: 'Cireng Mentah',
                    sku: 'IG-065',
                    category: 'Processed',
                    unit: 'Pack',
                    costPrice: 15000,
                    stockQuantity: 30,
                    minStock: 10,
                    yield: 100,
                    desc: 'Raw cireng'
                },
                {
                    name: 'Roti Tawar',
                    sku: 'IG-066',
                    category: 'Staple',
                    unit: 'Pack',
                    costPrice: 15000,
                    stockQuantity: 20,
                    minStock: 5,
                    yield: 100,
                    desc: 'White bread'
                },
                {
                    name: 'Bun Burger',
                    sku: 'IG-067',
                    category: 'Staple',
                    unit: 'Pcs',
                    costPrice: 3000,
                    stockQuantity: 50,
                    minStock: 10,
                    yield: 100,
                    desc: 'Burger bun'
                },
                {
                    name: 'Pasta Fettuccine',
                    sku: 'IG-068',
                    category: 'Staple',
                    unit: 'Pack',
                    costPrice: 14000,
                    stockQuantity: 30,
                    minStock: 5,
                    yield: 100,
                    desc: 'Fettuccine pasta'
                },
                {
                    name: 'Tepung Terigu',
                    sku: 'IG-069',
                    category: 'Staple',
                    unit: 'Kg',
                    costPrice: 12000,
                    stockQuantity: 50,
                    minStock: 10,
                    yield: 100,
                    desc: 'Wheat flour'
                },
                {
                    name: 'Tepung Maizena',
                    sku: 'IG-070',
                    category: 'Staple',
                    unit: 'Kg',
                    costPrice: 15000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Corn flour'
                },
                {
                    name: 'Es Batu',
                    sku: 'IG-071',
                    category: 'Supply',
                    unit: 'Bag',
                    costPrice: 5000,
                    stockQuantity: 100,
                    minStock: 20,
                    yield: 100,
                    desc: 'Ice cubes'
                },
                {
                    name: 'Air Mineral 600ml',
                    sku: 'IG-072',
                    category: 'Beverage',
                    unit: 'Pcs',
                    costPrice: 2500,
                    stockQuantity: 240,
                    minStock: 48,
                    yield: 100,
                    desc: 'Mineral water'
                },
                {
                    name: 'Sirup Melon',
                    sku: 'IG-073',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 45000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Melon syrup'
                },
                {
                    name: 'Soda Water',
                    sku: 'IG-074',
                    category: 'Beverage',
                    unit: 'Can',
                    costPrice: 7000,
                    stockQuantity: 48,
                    minStock: 12,
                    yield: 100,
                    desc: 'Soda'
                },
                {
                    name: 'Daun Mint',
                    sku: 'IG-075',
                    category: 'Spice',
                    unit: 'Pack',
                    costPrice: 10000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 95,
                    desc: 'Mint leaves'
                },
                {
                    name: 'Jahe Fresh',
                    sku: 'IG-076',
                    category: 'Spice',
                    unit: 'Kg',
                    costPrice: 25000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 80,
                    desc: 'Ginger'
                },
                {
                    name: 'Sereh',
                    sku: 'IG-077',
                    category: 'Spice',
                    unit: 'Ikat',
                    costPrice: 5000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 70,
                    desc: 'Lemongrass'
                },
                {
                    name: 'Blue Curacao Syrup',
                    sku: 'IG-078',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 95000,
                    stockQuantity: 4,
                    minStock: 1,
                    yield: 100,
                    desc: 'Blue syrup'
                },
                {
                    name: 'Grenadine Syrup',
                    sku: 'IG-079',
                    category: 'Syrup',
                    unit: 'Liter',
                    costPrice: 85000,
                    stockQuantity: 4,
                    minStock: 1,
                    yield: 100,
                    desc: 'Red syrup'
                },
                {
                    name: 'Whipped Cream',
                    sku: 'IG-080',
                    category: 'Dairy',
                    unit: 'Can',
                    costPrice: 65000,
                    stockQuantity: 12,
                    minStock: 3,
                    yield: 100,
                    desc: 'Whipped cream'
                },
                {
                    name: 'Vanilla Powder',
                    sku: 'IG-081',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 200,
                    stockQuantity: 2000,
                    minStock: 500,
                    yield: 100,
                    desc: 'Vanilla powder'
                },
                {
                    name: 'Hazelnut Powder',
                    sku: 'IG-082',
                    category: 'Beverage',
                    unit: 'Gram',
                    costPrice: 250,
                    stockQuantity: 2000,
                    minStock: 500,
                    yield: 100,
                    desc: 'Hazelnut powder'
                },
                {
                    name: 'Caramel Sauce',
                    sku: 'IG-083',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 75000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'Caramel sauce'
                },
                {
                    name: 'Chocolate Sauce',
                    sku: 'IG-084',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 75000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'Chocolate sauce'
                },
                {
                    name: 'Bubuk Kalsium',
                    sku: 'IG-085',
                    category: 'Supply',
                    unit: 'Gram',
                    costPrice: 50,
                    stockQuantity: 1000,
                    minStock: 200,
                    yield: 100,
                    desc: 'Calcium'
                },
                {
                    name: 'Ragi',
                    sku: 'IG-086',
                    category: 'Supply',
                    unit: 'Gram',
                    costPrice: 100,
                    stockQuantity: 500,
                    minStock: 100,
                    yield: 100,
                    desc: 'Yeast'
                },
                {
                    name: 'Baking Powder',
                    sku: 'IG-087',
                    category: 'Supply',
                    unit: 'Gram',
                    costPrice: 80,
                    stockQuantity: 1000,
                    minStock: 200,
                    yield: 100,
                    desc: 'Baking powder'
                },
                {
                    name: 'Vanila Extract',
                    sku: 'IG-088',
                    category: 'Supply',
                    unit: 'Bottle',
                    costPrice: 35000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Vanilla'
                },
                {
                    name: 'Kayu Manis Bubuk',
                    sku: 'IG-089',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 150,
                    stockQuantity: 1000,
                    minStock: 200,
                    yield: 100,
                    desc: 'Cinnamon'
                },
                {
                    name: 'Pala Bubuk',
                    sku: 'IG-090',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 200,
                    stockQuantity: 500,
                    minStock: 100,
                    yield: 100,
                    desc: 'Nutmeg'
                },
                {
                    name: 'Terasi Bakar',
                    sku: 'IG-091',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 50,
                    stockQuantity: 500,
                    minStock: 100,
                    yield: 100,
                    desc: 'Shrimp paste'
                },
                {
                    name: 'Kacang Tanah',
                    sku: 'IG-092',
                    category: 'Processed',
                    unit: 'Kg',
                    costPrice: 30000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 95,
                    desc: 'Peanut'
                },
                {
                    name: 'Kismis',
                    sku: 'IG-093',
                    category: 'Processed',
                    unit: 'Kg',
                    costPrice: 85000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'Raisin'
                },
                {
                    name: 'Oatmeal',
                    sku: 'IG-094',
                    category: 'Staple',
                    unit: 'Kg',
                    costPrice: 45000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Oat'
                },
                {
                    name: 'Biji Wijen',
                    sku: 'IG-095',
                    category: 'Spice',
                    unit: 'Gram',
                    costPrice: 100,
                    stockQuantity: 500,
                    minStock: 100,
                    yield: 100,
                    desc: 'Sesame'
                },
                {
                    name: 'Minyak Wijen',
                    sku: 'IG-096',
                    category: 'Oil',
                    unit: 'Bottle',
                    costPrice: 25000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Sesame oil'
                },
                {
                    name: 'Saus BBQ',
                    sku: 'IG-097',
                    category: 'Sauce',
                    unit: 'Liter',
                    costPrice: 55000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'BBQ sauce'
                },
                {
                    name: 'Mustard',
                    sku: 'IG-098',
                    category: 'Sauce',
                    unit: 'Bottle',
                    costPrice: 35000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 100,
                    desc: 'Mustard'
                },
                {
                    name: 'Acar Timun',
                    sku: 'IG-099',
                    category: 'Vegetable',
                    unit: 'Jar',
                    costPrice: 25000,
                    stockQuantity: 10,
                    minStock: 2,
                    yield: 100,
                    desc: 'Pickle'
                },
                {
                    name: 'Selada Fresh',
                    sku: 'IG-100',
                    category: 'Vegetable',
                    unit: 'Kg',
                    costPrice: 25000,
                    stockQuantity: 5,
                    minStock: 1,
                    yield: 80,
                    desc: 'Lettuce'
                }
            ];
            const seededIngredients = [];
            for (const ing of ingredientsData){
                try {
                    const result = await this.inventoryService.createIngredient({
                        name: ing.name,
                        sku: ing.sku,
                        category: ing.category,
                        unit: ing.unit,
                        costPrice: ing.costPrice,
                        stockQuantity: ing.stockQuantity,
                        minStockLevel: ing.minStock,
                        yieldPercentage: ing.yield,
                        description: ing.desc,
                        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + seededIngredients.length}?auto=format&fit=crop&q=60&w=200`
                    });
                    seededIngredients.push(result);
                } catch (e) {
                    const existing = await this.inventoryService.getAllIngredients();
                    const match = existing.find((i)=>i.sku === ing.sku || i.name === ing.name);
                    if (match) seededIngredients.push(match);
                }
            }
            // 2. Defined 50 Menu Items
            const menuData = [
                {
                    name: 'Nasi Goreng Jawa',
                    cat: 'Food',
                    price: 25000,
                    sku: 'MN-001'
                },
                {
                    name: 'Nasi Goreng Seafood',
                    cat: 'Food',
                    price: 35000,
                    sku: 'MN-002'
                },
                {
                    name: 'Nasi Goreng Ayam',
                    cat: 'Food',
                    price: 28000,
                    sku: 'MN-003'
                },
                {
                    name: 'Mie Goreng Spesial',
                    cat: 'Food',
                    price: 25000,
                    sku: 'MN-004'
                },
                {
                    name: 'Mie Kuah Jawa',
                    cat: 'Food',
                    price: 22000,
                    sku: 'MN-005'
                },
                {
                    name: 'Kwetiau Goreng Sapi',
                    cat: 'Food',
                    price: 32000,
                    sku: 'MN-006'
                },
                {
                    name: 'Ayam Goreng Lalapan',
                    cat: 'Food',
                    price: 25000,
                    sku: 'MN-007'
                },
                {
                    name: 'Ayam Bakar Madu',
                    cat: 'Food',
                    price: 28000,
                    sku: 'MN-008'
                },
                {
                    name: 'Sapi Lada Hitam',
                    cat: 'Food',
                    price: 45000,
                    sku: 'MN-009'
                },
                {
                    name: 'Capcay Goreng',
                    cat: 'Food',
                    price: 22000,
                    sku: 'MN-010'
                },
                {
                    name: 'Cah Kangkung Belacan',
                    cat: 'Food',
                    price: 15000,
                    sku: 'MN-011'
                },
                {
                    name: 'Sop Ayam',
                    cat: 'Food',
                    price: 20000,
                    sku: 'MN-012'
                },
                {
                    name: 'Soto Ayam',
                    cat: 'Food',
                    price: 20000,
                    sku: 'MN-013'
                },
                {
                    name: 'Burger Sapi Cheese',
                    cat: 'Food',
                    price: 35000,
                    sku: 'MN-014'
                },
                {
                    name: 'Hotdog Classic',
                    cat: 'Food',
                    price: 25000,
                    sku: 'MN-015'
                },
                {
                    name: 'Spaghetti Bolognese',
                    cat: 'Food',
                    price: 32000,
                    sku: 'MN-016'
                },
                {
                    name: 'Spaghetti Carbonara',
                    cat: 'Food',
                    price: 35000,
                    sku: 'MN-017'
                },
                {
                    name: 'Fish and Chips',
                    cat: 'Food',
                    price: 38000,
                    sku: 'MN-018'
                },
                {
                    name: 'Chicken Steak Crispy',
                    cat: 'Food',
                    price: 35000,
                    sku: 'MN-019'
                },
                {
                    name: 'Premium French Fries',
                    cat: 'Snack',
                    price: 18000,
                    sku: 'MN-020'
                },
                {
                    name: 'Onion Rings',
                    cat: 'Snack',
                    price: 15000,
                    sku: 'MN-021'
                },
                {
                    name: 'Chicken Nuggets',
                    cat: 'Snack',
                    price: 18000,
                    sku: 'MN-022'
                },
                {
                    name: 'Dimsum Mix Platter',
                    cat: 'Snack',
                    price: 25000,
                    sku: 'MN-023'
                },
                {
                    name: 'Cireng Bumbu Rujak',
                    cat: 'Snack',
                    price: 15000,
                    sku: 'MN-024'
                },
                {
                    name: 'Pisang Goreng Keju',
                    cat: 'Snack',
                    price: 15000,
                    sku: 'MN-025'
                },
                {
                    name: 'Roti Bakar Coklat',
                    cat: 'Snack',
                    price: 18000,
                    sku: 'MN-026'
                },
                {
                    name: 'Americano Ice',
                    cat: 'Drink',
                    price: 18000,
                    sku: 'MN-027'
                },
                {
                    name: 'Caffe Latte Hot',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-028'
                },
                {
                    name: 'Cappuccino Ice',
                    cat: 'Drink',
                    price: 28000,
                    sku: 'MN-029'
                },
                {
                    name: 'Mochaccino Ice',
                    cat: 'Drink',
                    price: 30000,
                    sku: 'MN-030'
                },
                {
                    name: 'Kopi Susu Gula Aren',
                    cat: 'Drink',
                    price: 22000,
                    sku: 'MN-031'
                },
                {
                    name: 'Caramel Macchiato',
                    cat: 'Drink',
                    price: 35000,
                    sku: 'MN-032'
                },
                {
                    name: 'Hazelnut Latte',
                    cat: 'Drink',
                    price: 32000,
                    sku: 'MN-033'
                },
                {
                    name: 'Vanilla Latte',
                    cat: 'Drink',
                    price: 32000,
                    sku: 'MN-034'
                },
                {
                    name: 'Espresso Single',
                    cat: 'Drink',
                    price: 15000,
                    sku: 'MN-035'
                },
                {
                    name: 'Espresso Double',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-036'
                },
                {
                    name: 'Teh Tarik Indian',
                    cat: 'Drink',
                    price: 18000,
                    sku: 'MN-037'
                },
                {
                    name: 'Thai Tea Original',
                    cat: 'Drink',
                    price: 18000,
                    sku: 'MN-038'
                },
                {
                    name: 'Green Tea Latte',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-039'
                },
                {
                    name: 'Lemon Tea Ice',
                    cat: 'Drink',
                    price: 15000,
                    sku: 'MN-040'
                },
                {
                    name: 'Lychee Tea Ice',
                    cat: 'Drink',
                    price: 18000,
                    sku: 'MN-041'
                },
                {
                    name: 'Jus Alpukat Kocok',
                    cat: 'Drink',
                    price: 20000,
                    sku: 'MN-042'
                },
                {
                    name: 'Jus Jeruk Peras',
                    cat: 'Drink',
                    price: 15000,
                    sku: 'MN-043'
                },
                {
                    name: 'Jus Mangga Fresh',
                    cat: 'Drink',
                    price: 18000,
                    sku: 'MN-044'
                },
                {
                    name: 'Strawberry Smoothies',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-045'
                },
                {
                    name: 'Chocolate Signature',
                    cat: 'Drink',
                    price: 22000,
                    sku: 'MN-046'
                },
                {
                    name: 'Milkshake Vanilla',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-047'
                },
                {
                    name: 'Milkshake Chocolate',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-048'
                },
                {
                    name: 'Virgin Mojito',
                    cat: 'Drink',
                    price: 22000,
                    sku: 'MN-049'
                },
                {
                    name: 'Blue Lagoon Mocktail',
                    cat: 'Drink',
                    price: 25000,
                    sku: 'MN-050'
                }
            ];
            const seededMenuItems = [];
            for (const menu of menuData){
                try {
                    const result = await this.cafeService.createMenuItem({
                        name: menu.name,
                        category: menu.cat,
                        price: menu.price,
                        sku: menu.sku,
                        taxPercentage: 10,
                        description: `Delicious ${menu.name} prepared fresh.`,
                        imageUrl: `https://images.unsplash.com/photo-${1600000000000 + seededMenuItems.length}?auto=format&fit=crop&q=60&w=300`
                    });
                    seededMenuItems.push(result);
                } catch (e) {
                    const existing = await this.cafeService.getAllMenuItems(true);
                    const match = existing.find((m)=>m.sku === menu.sku || m.name === menu.name);
                    if (match) seededMenuItems.push(match);
                }
            }
            // 3. Automated Recipes (Simplified mappings)
            const findIngId = (name)=>seededIngredients.find((i)=>i.name === name)?.id;
            const findMenuId = (sku)=>seededMenuItems.find((m)=>m.sku === sku)?.id;
            // Apply recipes to some key items
            const recipes = [
                {
                    m: 'MN-001',
                    items: [
                        {
                            n: 'Beras Basmathi',
                            q: 200,
                            u: 'Gram'
                        },
                        {
                            n: 'Telur Ayam',
                            q: 1,
                            u: 'Butir'
                        },
                        {
                            n: 'Minyak Kelapa',
                            q: 50,
                            u: 'Ml'
                        }
                    ]
                },
                {
                    m: 'MN-002',
                    items: [
                        {
                            n: 'Beras Basmathi',
                            q: 200,
                            u: 'Gram'
                        },
                        {
                            n: 'Udang Fresh',
                            q: 50,
                            u: 'Gram'
                        },
                        {
                            n: 'Cumi-cumi',
                            q: 50,
                            u: 'Gram'
                        }
                    ]
                },
                {
                    m: 'MN-009',
                    items: [
                        {
                            n: 'Daging Sapi Sirloin',
                            q: 150,
                            u: 'Gram'
                        },
                        {
                            n: 'Lada Hitam Bubuk',
                            q: 5,
                            u: 'Gram'
                        },
                        {
                            n: 'Bawang Bombay',
                            q: 50,
                            u: 'Gram'
                        }
                    ]
                },
                {
                    m: 'MN-014',
                    items: [
                        {
                            n: 'Daging Giling',
                            q: 100,
                            u: 'Gram'
                        },
                        {
                            n: 'Bun Burger',
                            q: 1,
                            u: 'Pcs'
                        },
                        {
                            n: 'Keju Cheddar',
                            q: 1,
                            u: 'Pack'
                        }
                    ]
                },
                {
                    m: 'MN-016',
                    items: [
                        {
                            n: 'Pasta Spaghetti',
                            q: 1,
                            u: 'Pack'
                        },
                        {
                            n: 'Daging Giling',
                            q: 50,
                            u: 'Gram'
                        },
                        {
                            n: 'Tomat',
                            q: 100,
                            u: 'Gram'
                        }
                    ]
                },
                {
                    m: 'MN-027',
                    items: [
                        {
                            n: 'Biji Kopi Arabica',
                            q: 18,
                            u: 'Gram'
                        },
                        {
                            n: 'Es Batu',
                            q: 1,
                            u: 'Bag'
                        }
                    ]
                },
                {
                    m: 'MN-028',
                    items: [
                        {
                            n: 'Biji Kopi Arabica',
                            q: 18,
                            u: 'Gram'
                        },
                        {
                            n: 'Susu UHT',
                            q: 200,
                            u: 'Ml'
                        }
                    ]
                },
                {
                    m: 'MN-031',
                    items: [
                        {
                            n: 'Biji Kopi Robusta',
                            q: 18,
                            u: 'Gram'
                        },
                        {
                            n: 'Susu UHT',
                            q: 100,
                            u: 'Ml'
                        },
                        {
                            n: 'Gula Aren',
                            q: 20,
                            u: 'Ml'
                        }
                    ]
                },
                {
                    m: 'MN-042',
                    items: [
                        {
                            n: 'Alpukat',
                            q: 200,
                            u: 'Gram'
                        },
                        {
                            n: 'Susu Kental Manis',
                            q: 50,
                            u: 'Ml'
                        },
                        {
                            n: 'Es Batu',
                            q: 0.5,
                            u: 'Bag'
                        }
                    ]
                }
            ];
            for (const r of recipes){
                const mid = findMenuId(r.m);
                if (mid) {
                    const mapped = r.items.map((i)=>({
                            ingredientId: findIngId(i.n),
                            quantity: i.q,
                            unit: i.u
                        })).filter((x)=>x.ingredientId);
                    await this.inventoryService.setRecipe(mid, mapped);
                }
            }
            return {
                message: 'Massive Seeding Completed',
                ingredients: seededIngredients.length,
                menus: seededMenuItems.length
            };
        } catch (error) {
            return {
                error: true,
                message: error.message
            };
        }
    }
    constructor(billiardService, inventoryService, cafeService, settingsService, memberService){
        this.billiardService = billiardService;
        this.inventoryService = inventoryService;
        this.cafeService = cafeService;
        this.settingsService = settingsService;
        this.memberService = memberService;
    }
};
_ts_decorate([
    (0, _common.Post)('bulk'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "bulkSeed", null);
_ts_decorate([
    (0, _common.Post)('seed-settings'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "seedSettings", null);
_ts_decorate([
    (0, _common.Post)('seed-members'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "seedMembers", null);
_ts_decorate([
    (0, _common.Post)('seed-packages'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "seedPackages", null);
_ts_decorate([
    (0, _common.Post)('seed-tables'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "seedTables", null);
_ts_decorate([
    (0, _common.Post)('seed-cafe'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], SeederController.prototype, "seedCafe", null);
SeederController = _ts_decorate([
    (0, _common.Controller)('seeder'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _billiardservice.BilliardService === "undefined" ? Object : _billiardservice.BilliardService,
        typeof _inventoryservice.InventoryService === "undefined" ? Object : _inventoryservice.InventoryService,
        typeof _cafeservice.CafeService === "undefined" ? Object : _cafeservice.CafeService,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _memberservice.MemberService === "undefined" ? Object : _memberservice.MemberService
    ])
], SeederController);

//# sourceMappingURL=seeder.controller.js.map