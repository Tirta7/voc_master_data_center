"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AIService", {
    enumerable: true,
    get: function() {
        return AIService;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _fs = /*#__PURE__*/ _interop_require_wildcard(require("fs"));
const _path = /*#__PURE__*/ _interop_require_wildcard(require("path"));
const _tfjs = /*#__PURE__*/ _interop_require_wildcard(require("@tensorflow/tfjs"));
const _javascriptlpsolver = /*#__PURE__*/ _interop_require_default(require("javascript-lp-solver"));
const _battleplanentity = require("./entities/battle-plan.entity");
const _battleplanitementity = require("./entities/battle-plan-item.entity");
const _menuitementity = require("../cafe/entities/menu-item.entity");
const _transactionentity = require("../transaction/entities/transaction.entity");
const _businessdayentity = require("../finance/entities/business-day.entity");
const _orderitementity = require("../cafe/entities/order-item.entity");
const _billiardpackageentity = require("../billiard/entities/billiard-package.entity");
const _tableentity = require("../billiard/entities/table.entity");
const _cafetableentity = require("../cafe-table/entities/cafe-table.entity");
const _userentity = require("../user/entities/user.entity");
const _shiftentity = require("../finance/entities/shift.entity");
const _settingentity = require("../settings/entities/setting.entity");
const _upsellpromptentity = require("./entities/upsell-prompt.entity");
const _nodemachineid = require("node-machine-id");
const _eventsgateway = require("../socket/events.gateway");
const _promoentity = require("../promo/entities/promo.entity");
const _ingrediententity = require("../inventory/entities/ingredient.entity");
const _wasteentity = require("../inventory/entities/waste.entity");
const _holidayentity = require("../settings/entities/holiday.entity");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
const BP_FALLBACK_PRICE = (bp)=>{
    if (!bp) return 0;
    if (Number(bp.price) > 0) return Number(bp.price);
    return (Number(bp.minutePrice) || 500) * 60; // 500/min is basic fallback
};
let AIService = class AIService {
    async onModuleInit() {
        this.logger.log('AIService: Initializing AI Self-Learning Models...');
        // Ensure storage directory exists
        if (!_fs.existsSync(this.AI_STORAGE_DIR)) {
            _fs.mkdirSync(this.AI_STORAGE_DIR, {
                recursive: true
            });
        }
        await this.initDQN();
        await this.loadAIState(); // Load persisted intelligence
        await this.discoverComboRules();
        // Pre-warm AI Forecasts (Background)
        this.logger.log('AIService: Pre-warming AI Strategy Caches...');
        this.refreshAIForecasts().catch((err)=>this.logger.error(`Initial AI Warm-up failed: ${err.message}`));
    }
    async initDQN() {
        try {
            this.dqnModel = _tfjs.sequential();
            this.dqnModel.add(_tfjs.layers.dense({
                units: 24,
                activation: 'relu',
                inputShape: [
                    3
                ]
            })); // State: [hour, activeTables, avgCheckSoFar]
            this.dqnModel.add(_tfjs.layers.dense({
                units: 24,
                activation: 'relu'
            }));
            this.dqnModel.add(_tfjs.layers.dense({
                units: 5
            })); // Top 5 candidates
            this.dqnModel.compile({
                optimizer: 'adam',
                loss: 'meanSquaredError'
            });
            this.logger.log('DQN Neural Network compiled for Upsell Optimization.');
        } catch (err) {
            this.logger.error(`Failed to initialize DQN: ${err.message}`);
        }
    }
    async saveAIState() {
        try {
            // 1. Ensure the specific model directory exists for TF
            const modelDir = _path.join(this.AI_STORAGE_DIR, 'dqn_model');
            if (!_fs.existsSync(modelDir)) {
                _fs.mkdirSync(modelDir, {
                    recursive: true
                });
            }
            // 2. Save TensorFlow Model
            await this.dqnModel.save(this.MODEL_PATH);
            // 2. Save Experience Buffer
            _fs.writeFileSync(this.BUFFER_FILE, JSON.stringify(this.experienceBuffer));
            this.logger.log('AI Intelligence State persisted to local storage.');
        } catch (err) {
            this.logger.error(`Failed to save AI state: ${err.message}`);
        }
    }
    async loadAIState() {
        try {
            // 1. Load Model if exists
            const modelJson = _path.join(process.cwd(), 'storage', 'ai', 'dqn_model', 'model.json');
            if (_fs.existsSync(modelJson)) {
                this.dqnModel = await _tfjs.loadLayersModel(`${this.MODEL_PATH}/model.json`);
                this.dqnModel.compile({
                    optimizer: 'adam',
                    loss: 'meanSquaredError'
                });
                this.logger.log('DQN Neural Network loaded from persistent storage.');
            }
            // 2. Load Buffer if exists
            if (_fs.existsSync(this.BUFFER_FILE)) {
                const data = _fs.readFileSync(this.BUFFER_FILE, 'utf-8');
                this.experienceBuffer = JSON.parse(data);
                this.logger.log(`AI Experience Buffer loaded (${this.experienceBuffer.length} samples).`);
            }
        } catch (err) {
            this.logger.warn(`Could not load AI state (Normal if first run): ${err.message}`);
        }
    }
    async scheduledAISave() {
        await this.saveAIState();
    }
    async getActiveBusinessDay() {
        return this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                id: 'DESC'
            }
        });
    }
    async pruneHistoricalLogs() {
        this.logger.log('AIService: Starting autonomous database maintenance...');
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const deleteResult = await this.upsellPromptRepo.delete({
                createdAt: (0, _typeorm1.LessThan)(thirtyDaysAgo)
            });
            this.logger.log(`Autonomous Maintenance Complete: Purged ${deleteResult.affected} old AI logs.`);
        } catch (err) {
            this.logger.error(`Autonomous Maintenance Failed: ${err.message}`);
        }
    }
    async checkProactiveOpportunities() {
        // 1. Check if Auto-Promote is enabled in settings
        const settings = await this.settingRepo.findOne({
            where: {}
        });
        if (!settings || !settings.aiAutoPromote) return;
        this.logger.log('AI: Checking for proactive promotion opportunities...');
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                date: 'DESC'
            }
        });
        if (!activeBday) return;
        // 2. Check Occupancy
        const tableCount = await this.tableRepo.count();
        const activeTables = await this.tableRepo.count({
            where: [
                {
                    status: _tableentity.TableStatus.IN_USE
                },
                {
                    isBooked: true
                }
            ]
        });
        const occupancy = tableCount > 0 ? activeTables / tableCount : 0;
        // Only auto-promote if occupancy is high enough to avoid being annoying during slow hours
        // Threshold is now configurable in settings (default 0.6 / 60%)
        const threshold = Number(settings.aiAutoPromoteThreshold || 0.6);
        if (occupancy < threshold) {
            this.logger.debug(`AI: Occupancy below threshold (${Math.round(occupancy * 100)}% < ${Math.round(threshold * 100)}%). Skipping proactive push.`);
            return;
        }
        const plan = await this.getCurrentBattlePlan(activeBday.id);
        if (!plan || plan.status !== _battleplanentity.BattlePlanStatus.PUBLISHED) return;
        // 3. Find Lagging Items (Achievement < 40% and remaining target > 5)
        const laggingItems = plan.items.filter((it)=>it.soldQuantity < it.targetQuantity * 0.4 && it.targetQuantity - it.soldQuantity > 5);
        if (laggingItems.length === 0) return;
        // 4. Trigger opportunistic broadcast for the most lagging item
        const target = laggingItems.sort((a, b)=>a.soldQuantity / a.targetQuantity - b.soldQuantity / b.targetQuantity)[0];
        const itemName = target.menuItem?.name || target.billiardPackage?.name || 'Item';
        this.logger.log(`AI: Proactive trigger! High occupancy detected with lagging targets. Pushing ${itemName}.`);
        await this.manualBroadcastItem(target.menuItem?.id || target.billiardPackage?.id, target.menuItem ? 'CAFE' : 'BILLIARD');
    }
    async getDQNState() {
        const now = new Date();
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                date: 'DESC'
            }
        });
        if (!activeBday) return [
            now.getHours(),
            0,
            0
        ];
        // Real-world state: hour (norm), active table count (norm), current revenue (norm)
        const tableCount = await this.tableRepo.count();
        const activeTables = await this.tableRepo.count({
            where: {
                status: _tableentity.TableStatus.IN_USE
            }
        }); // Real occupancy from Billiard
        const occupancy = tableCount > 0 ? activeTables / tableCount : 0;
        return [
            now.getHours() / 24,
            occupancy,
            Math.min(activeBday.totalRevenue / 10000000, 1)
        ];
    }
    async calculateTargetMix(targetRevenue) {
        const [menuItems, billiardPackages, promos, tableCount, metrics, cafeHistory, billiardHistory, availabilityMap] = await Promise.all([
            this.menuItemRepo.find({
                relations: [
                    'productFinance',
                    'category'
                ],
                where: {
                    isActive: true
                }
            }),
            this.billiardPackageRepo.find({
                where: {
                    isActive: true
                }
            }),
            this.promoRepo.find({
                where: {
                    isActive: true
                }
            }),
            this.tableRepo.count(),
            this.getDynamicMetrics(),
            this.fetchItemSalesHistory(7),
            this.fetchBilliardSalesHistory(7),
            this.inventoryService.getMenuAvailability()
        ]);
        const historyMap = {};
        cafeHistory.forEach((h)=>{
            historyMap[`menu_${h.menuItemId}`] = Number(h.totalSold);
        });
        billiardHistory.forEach((h)=>{
            historyMap[`pkg_${h.packageId}`] = Number(h.totalSold);
        });
        // Add promo history if any (from usageCount as proxy or fresh query)
        promos.forEach((p)=>{
            historyMap[`promo_${p.id}`] = Number(p.usageCount || 0) / 30;
        }); // Heuristic avg per day
        this.logger.log(`AI Simulation: Items: ${menuItems.length} Cafe, ${billiardPackages.length} Billiard`);
        // Determine Staffing Pressure for Adaptation
        const estCustomerCount = Math.ceil(targetRevenue / metrics.avgCheck);
        const staffNeed = await this.calculateStaffNeed(estCustomerCount, tableCount);
        const usePressureAdaptation = staffNeed.isShortage;
        this.logger.log(`AI Simulation: Pressure ${usePressureAdaptation ? 'HIGH' : 'NORMAL'}. Target: ${targetRevenue}. Est Customers: ${estCustomerCount}`);
        // Normalize items for the solver
        const allValidItems = [
            ...menuItems.filter((i)=>{
                const nameUpper = i.name.toUpperCase();
                const catUpper = i.category?.name?.toUpperCase() || '';
                const isExcludedCategory = [
                    'BILLIARD',
                    'INVENTORY',
                    'AKSESORIS'
                ].includes(catUpper);
                const isChalk = nameUpper.includes('CHALK');
                return Number(i.price) > 0 && !isExcludedCategory && !isChalk;
            }).map((i)=>{
                const hpp = i.productFinance ? Number(i.productFinance.baseHpp) : 0;
                const baseMargin = hpp > 0 ? Number(i.price) - hpp : Number(i.price) * 0.3;
                const isKds = i.category?.productionTarget === 'KDS';
                // --- PHASE 26: INVENTORY SENSITIVITY ---
                const stock = availabilityMap[i.id] ?? Number(i.stockQuantity || 0);
                let inventoryBoost = 1.0;
                // If stock is high (> 20) and we have historical data, check velocity
                if (stock > 20) {
                    const histDaily = (historyMap[`menu_${i.id}`] || 0) / 7 || 0.1;
                    const daysOfStock = stock / histDaily;
                    if (daysOfStock > 14) {
                        // More than 2 weeks of stock = Overstock pressure
                        inventoryBoost = 1.5; // 50% boost to solver priority
                    }
                }
                // Multiplier for adaptation
                let adaptiveMargin = baseMargin * inventoryBoost;
                if (usePressureAdaptation && isKds) {
                    adaptiveMargin *= 0.8;
                }
                return {
                    id: i.id,
                    name: i.name,
                    price: Number(i.price),
                    stock: stock,
                    margin: baseMargin,
                    solveMargin: adaptiveMargin,
                    isOverstock: inventoryBoost > 1,
                    type: 'CAFE',
                    varName: `menu_${i.id}`,
                    isKds
                };
            }),
            ...billiardPackages.filter((p)=>p.isActive).map((p)=>{
                let effectivePrice = Number(p.price) > 0 ? Number(p.price) : Number(p.minutePrice) * 60;
                // Fallback for simulation if pricing is altogether missing
                if (effectivePrice <= 0) {
                    effectivePrice = 30000;
                }
                return {
                    id: p.id,
                    name: p.name,
                    price: effectivePrice,
                    stock: 0,
                    margin: effectivePrice * 0.9,
                    solveMargin: effectivePrice * 0.9,
                    type: 'BILLIARD',
                    varName: `pkg_${p.id}`,
                    isKds: false
                };
            }),
            ...promos.map((p)=>{
                const rule = p.ruleJson || {};
                const price = Number(rule.fixedPrice || 0);
                const hpp = Number(p.estimatedHpp || price * 0.5);
                const margin = price - hpp;
                return {
                    id: p.id,
                    name: p.name,
                    price: price,
                    stock: 0,
                    margin: margin,
                    solveMargin: margin * 1.2,
                    type: 'PROMO',
                    varName: `promo_${p.id}`,
                    isKds: false
                };
            })
        ];
        if (allValidItems.length === 0) {
            return {
                items: [],
                predictedRevenue: 0,
                aiStrategyBrief: 'Gagal simulasi: Tidak ada item aktif.',
                feasible: false
            };
        }
        // Calculate Physical Capacity for Billiard (Approx 12 hours operational window)
        const OPERATIONAL_HOURS = 12;
        const MAX_BILLIARD_CAPACITY = tableCount * OPERATIONAL_HOURS; // 1 session per hour per table
        const runSolver = (isFallback = false)=>{
            const model = {
                optimize: 'solveMargin',
                opType: 'max',
                constraints: {
                    revenue: {
                        min: Number(targetRevenue),
                        max: Number(targetRevenue) * 1.1
                    }
                },
                variables: {},
                ints: {}
            };
            allValidItems.forEach((item)=>{
                model.variables[item.varName] = {
                    revenue: item.price,
                    margin: item.margin,
                    [item.varName]: 1
                };
                const historicalAvg = (historyMap[item.varName] || 0) / 7;
                let demandCapacity = isFallback ? 200 : Math.max(Math.round(historicalAvg * 5), 10);
                // Limit billiard based on physical capacity
                if (item.type === 'BILLIARD') {
                    demandCapacity = Math.min(demandCapacity, MAX_BILLIARD_CAPACITY);
                    // Ensure we at least suggest filling half the capacity if target is high
                    if (targetRevenue > 2000000) {
                        demandCapacity = Math.max(demandCapacity, Math.floor(MAX_BILLIARD_CAPACITY * 0.5));
                    }
                }
                // Billiard packages have high turnover, cafe items might have realistic serving limits per day
                const MAX_CAFE_DEMAND = 50;
                const effectiveMax = item.type === 'CAFE' ? Math.min(item.stock, demandCapacity, MAX_CAFE_DEMAND) : demandCapacity;
                model.constraints[item.varName] = {
                    max: effectiveMax
                };
                model.ints[item.varName] = 1;
            });
            const lpSolver = _javascriptlpsolver.default.Solve ? _javascriptlpsolver.default : _javascriptlpsolver.default.default;
            return lpSolver.Solve(model);
        };
        let result = runSolver(false);
        let isBestEffort = false;
        if (!result.feasible) {
            this.logger.warn(`AI Simulation: Initial solve infeasible. Running fallback.`);
            result = runSolver(true);
            if (!result.feasible) {
                this.logger.error(`AI Simulation: Even fallback failed for target Rp ${targetRevenue}. Using Max Effort strategy.`);
                isBestEffort = true;
                // Best Effort Results: Max out demand capacity for all items within reason
                result = {};
                allValidItems.forEach((item)=>{
                    const historicalAvg = (historyMap[item.varName] || 0) / 7;
                    const demandCapacity = Math.max(Math.round(historicalAvg * 8), 50); // Aggressive capacity for best effort
                    if (item.type === 'BILLIARD') {
                        result[item.varName] = Math.min(demandCapacity, MAX_BILLIARD_CAPACITY);
                    } else {
                        result[item.varName] = Math.min(item.stock > 0 ? item.stock : 999, demandCapacity, 100); // 100 max cafe items for best effort
                    }
                });
            }
        }
        let calculatedRevenue = 0;
        const items = allValidItems.map((item)=>{
            const qty = Math.round(result[item.varName] || 0);
            calculatedRevenue += qty * item.price;
            // --- PHASE 41: STRATEGY TRACEABILITY (Justifications) ---
            let justification = 'Optimasi Margin';
            if (item.type === 'CAFE' && item.isOverstock) justification = '📦 Reduksi Stok (Overstock)';
            else if (item.type === 'BILLIARD') justification = '🎯 Sinergi Okupansi Meja';
            else if (item.margin / item.price > 0.6) justification = '⭐ High Margin Synergy';
            else if (item.type === 'PROMO') justification = '🎁 Paket Promo Hemat';
            else if (historyMap[item.varName] > 20) justification = '🔥 Tren Penjualan Tinggi';
            let label = '✨ NORMAL';
            if (item.type === 'CAFE' && item.isOverstock) label = '📦 OVERSTOCK';
            else if (item.type === 'PROMO') label = '🎁 PROMO';
            else if (qty > 10) label = item.type === 'BILLIARD' ? '🔥 POPULAR' : '🔥 LARIS';
            return {
                id: item.id,
                name: item.name,
                price: item.price,
                targetQuantity: qty,
                margin: item.margin,
                stock: item.stock,
                aiLabel: label,
                justification,
                type: item.type
            };
        }).filter((rec)=>rec.targetQuantity > 0);
        const aiStrategyBrief = items.length > 0 ? (isBestEffort ? `⚠️ TARGET SANGAT AGRESIF: Target Rp ${Number(targetRevenue).toLocaleString('id-ID')} melampaui kapasitas historis. AI merekomendasikan "Strategi Maksimal".` : `Simulasi AI berhasil untuk target Rp ${Number(targetRevenue).toLocaleString('id-ID')}. `) + `Rekomendasi mencakup kombinasi ${items.filter((i)=>i.type === 'BILLIARD').length} Paket Billiard dan ${items.filter((i)=>i.type === 'CAFE').length} Menu Cafe.` : `Gagal menemukan komposisi untuk target Rp ${Number(targetRevenue).toLocaleString('id-ID')}.`;
        // Calculate Strategy Balance Score (0-100)
        // Measures Risk (over-reliance on few items) vs Reward (margin efficiency)
        const marginEfficiency = calculatedRevenue > 0 ? items.reduce((s, i)=>s + i.margin * i.targetQuantity, 0) / calculatedRevenue * 100 : 0;
        const diversityBonus = Math.min(items.length * 5, 30); // Max 30% from diversity
        const strategyScore = Math.min(100, Math.round(marginEfficiency + diversityBonus));
        return {
            items,
            predictedRevenue: calculatedRevenue,
            aiStrategyBrief,
            strategyScore,
            feasible: result.feasible || isBestEffort
        };
    }
    /**
   * Phase 41: Intelligent Goal Synthesis
   * Suggests a realistic revenue target based on traffic forecast and historical AOV
   */ async suggestDailyTarget() {
        const now = Date.now();
        if (this.targetSuggestionCache && now - this.targetSuggestionCache.timestamp < this.AI_CACHE_TTL_MS) {
            return this.targetSuggestionCache.data;
        }
        const prediction = await this.predictDailyTraffic();
        const metrics = await this.getDynamicMetrics();
        const baseTarget = prediction.predictedCustomerCount * metrics.avgCheck;
        // Adjust based on peak hours density
        const peakFactor = prediction.peakHours.length > 0 ? 1.15 : 1.0; // 15% upsell potential during peaks
        const suggestedTarget = Math.round(baseTarget * peakFactor / 50000) * 50000; // Round to nearest 50k
        let justification = `Berdasarkan prediksi ${prediction.predictedCustomerCount} pelanggan dengan rata-rata belanja ${metrics.avgCheck.toLocaleString('id-ID')}.`;
        if (peakFactor > 1) justification += ` Tambahan 15% target dialokasikan untuk intensitas jam sibuk.`;
        const result = {
            suggestedTarget,
            justification,
            confidence: prediction.isHeuristic ? 70 : 85
        };
        this.targetSuggestionCache = {
            data: result,
            timestamp: now
        };
        return result;
    }
    /**
   * Menu Pattern Classification using brain.js
   * Categorizes items based on 7-day sales velocity
   */ async classifyMenuItems() {
        const history = await this.fetchItemSalesHistory(7);
        if (history.length === 0) return {};
        const maxSales = Math.max(...history.map((h)=>Number(h.totalSold)), 1);
        // Using TensorFlow.js instead of brain.js to avoid 'gl' binding issues
        const model = _tfjs.sequential();
        model.add(_tfjs.layers.dense({
            units: 8,
            activation: 'relu',
            inputShape: [
                1
            ]
        }));
        model.add(_tfjs.layers.dense({
            units: 3,
            activation: 'softmax'
        }));
        model.compile({
            optimizer: _tfjs.train.adam(0.01),
            loss: 'categoricalCrossentropy'
        });
        const xs = _tfjs.tensor2d(history.map((h)=>[
                Number(h.totalSold) / maxSales
            ]));
        const ys = _tfjs.tensor2d(history.map((h)=>{
            const s = Number(h.totalSold);
            if (s > maxSales * 0.7) return [
                1,
                0,
                0
            ];
            if (s > maxSales * 0.3) return [
                0,
                1,
                0
            ];
            return [
                0,
                0,
                1
            ];
        }));
        await model.fit(xs, ys, {
            epochs: 20,
            verbose: 0
        });
        const results = {};
        const preds = model.predict(xs);
        const predData = await preds.array();
        history.forEach((h, i)=>{
            const output = predData[i];
            if (output[0] > 0.6) results[h.menuItemId] = '🔥 HOT';
            else if (output[2] > 0.6) results[h.menuItemId] = '❄️ COLD';
            else results[h.menuItemId] = '✨ NORMAL';
        });
        // Memory Cleanup
        xs.dispose();
        ys.dispose();
        preds.dispose();
        model.dispose();
        return results;
    }
    async fetchItemSalesHistory(days) {
        const now = Date.now();
        if (this.cafeHistoryCache && now - this.cafeHistoryCache.timestamp < this.CACHE_TTL_MS) {
            return this.cafeHistoryCache.data;
        }
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const data = await this.orderItemRepo.createQueryBuilder('oi').select('oi.menuItemId', 'menuItemId').addSelect('SUM(oi.quantity)', 'totalSold').where('oi.status = :status', {
            status: _orderitementity.OrderItemStatus.DONE
        }).andWhere('oi.createdAt >= :cutoff', {
            cutoff
        }).groupBy('oi.menuItemId').getRawMany();
        this.cafeHistoryCache = {
            data,
            timestamp: now
        };
        return data;
    }
    async fetchBilliardSalesHistory(days) {
        const now = Date.now();
        if (this.billiardHistoryCache && now - this.billiardHistoryCache.timestamp < this.CACHE_TTL_MS) {
            return this.billiardHistoryCache.data;
        }
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const data = await this.transactionRepo.createQueryBuilder('t').select('t.packageId', 'packageId').addSelect('COUNT(t.id)', 'totalSold').where('t.status = :status', {
            status: _transactionentity.TransactionStatus.PAID
        }).andWhere('t.createdAt >= :cutoff', {
            cutoff
        }).andWhere('t.packageId IS NOT NULL').groupBy('t.packageId').getRawMany();
        this.billiardHistoryCache = {
            data,
            timestamp: now
        };
        return data;
    }
    /**
   * Real-time progress tracking for Battle Plan.
   * Increments the sold quantity of the corresponding item.
   */ async trackSale(type, id, quantity = 1) {
        try {
            // Find active business day
            const activeBday = await this.businessDayRepo.findOne({
                where: {
                    isClosed: false
                },
                order: {
                    date: 'DESC'
                }
            });
            if (!activeBday) return;
            const plan = await this.getCurrentBattlePlan(activeBday.id);
            if (!plan) return;
            const item = plan.items.find((it)=>type === 'CAFE' && it.menuItemId === id || type === 'BILLIARD' && it.packageId === id || type === 'PROMO' && it.promoId === id);
            if (item) {
                item.soldQuantity += quantity;
                await this.battlePlanItemRepo.save(item);
                // Broadcast update to all connected dashboards
                this.eventsGateway.battlePlanUpdated({
                    type: 'PROGRESS_UPDATE',
                    itemId: item.id,
                    soldQuantity: item.soldQuantity,
                    targetQuantity: item.targetQuantity
                });
                this.logger.log(`Tracked ${type} sale: ${id} x ${quantity}. Progress: ${item.soldQuantity}/${item.targetQuantity}`);
            // --- PHASE 42: AI WASTE PREDICTION ---
            // If an item is sold, we might want to re-calculate waste risk
            }
        } catch (err) {
            this.logger.error(`Failed to track sale for AI: ${err.message}`);
        }
    }
    /**
   * AI Predict: Identify items at risk of becoming waste before upcoming holidays/closures
   */ async predictPotentialWaste() {
        const [ingredients, holidays, closures] = await Promise.all([
            this.ingredientRepo.find(),
            this.holidayRepo.find({
                where: {
                    isClosure: true
                }
            }),
            this.closureRepo.find()
        ]);
        const now = new Date();
        const nextSevenDays = new Date();
        nextSevenDays.setDate(now.getDate() + 7);
        // Find nearest closure
        const upcomingClosures = [
            ...holidays.map((h)=>({
                    start: new Date(h.date),
                    end: new Date(h.date),
                    reason: h.name
                })),
            ...closures.map((c)=>({
                    start: new Date(c.startDate),
                    end: new Date(c.endDate),
                    reason: c.reason
                }))
        ].filter((c)=>c.start >= now && c.start <= nextSevenDays);
        if (upcomingClosures.length === 0) return [];
        const nearest = upcomingClosures.sort((a, b)=>a.start.getTime() - b.start.getTime())[0];
        const daysUntilClosure = Math.ceil((nearest.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Analyze each ingredient
        const salesHistory = await this.fetchItemSalesHistory(14); // 2 weeks for velocity
        const velocityMap = {};
        salesHistory.forEach((h)=>{
            velocityMap[h.menuItemId] = Number(h.totalSold) / 14;
        });
        const results = [];
        for (const ing of ingredients){
            // Logic: If current stock > (velocity * days until closure), excess is at risk
            const velocity = velocityMap[ing.id] || 0.1; // fallback low velocity
            const expectedConsumption = velocity * daysUntilClosure;
            const potentialExcess = Number(ing.stockQuantity) - expectedConsumption;
            if (potentialExcess > 0 && (ing.isHighValue || ing.minStockLevel > 0)) {
                const riskLevel = potentialExcess / (ing.minStockLevel || 1) > 2 ? 'HIGH' : 'MEDIUM';
                results.push({
                    ingredientId: ing.id,
                    name: ing.name,
                    currentStock: ing.stockQuantity,
                    expectedConsumption: Math.round(expectedConsumption * 100) / 100,
                    potentialWaste: Math.round(potentialExcess * 100) / 100,
                    valuation: Math.round(potentialExcess * Number(ing.costPrice || 0)),
                    riskLevel,
                    closureDate: nearest.start,
                    reason: nearest.reason
                });
            }
        }
        return results.sort((a, b)=>b.valuation - a.valuation);
    }
    /**
   * AI Analytics: Menu Engineering Matrix
   * Categorizes items into STARS, PLOWHORSES, PUZZLES, DOGS
   */ /**
   * AI Analytics: Anomaly Detection in Waste
   */ async detectWasteAnomalies() {
        const wastes = await this.wasteRepo.find({
            relations: [
                'ingredient'
            ],
            order: {
                createdAt: 'DESC'
            },
            take: 100
        });
        if (wastes.length < 10) return [];
        // Simple Z-Score anomaly detection on valuation
        const values = wastes.map((w)=>Number(w.valuation));
        const mean = values.reduce((a, b)=>a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.map((v)=>Math.pow(v - mean, 2)).reduce((a, b)=>a + b, 0) / values.length);
        return wastes.filter((w)=>{
            const z = (Number(w.valuation) - mean) / (stdDev || 1);
            return z > 2; // More than 2 std devs away
        }).map((w)=>({
                id: w.id,
                itemName: w.ingredient.name,
                valuation: w.valuation,
                date: w.createdAt,
                type: 'HIGH_VALUE_WASTE',
                severity: 'CRITICAL'
            }));
    }
    async getDynamicMetrics() {
        const stats = await this.transactionRepo.createQueryBuilder('t').select('AVG(t."grandTotal")', 'avgCheck').addSelect('COUNT(t.id)::float / NULLIF(COUNT(DISTINCT t."businessDayId"), 0)', 'avgCustPerDay').where('t.status = :status', {
            status: _transactionentity.TransactionStatus.PAID
        }).getRawOne();
        return {
            avgCheck: Math.round(Number(stats?.avgCheck || 75000)),
            avgCust: Math.round(Number(stats?.avgCustPerDay || 25))
        };
    }
    /**
   * Calculates real-time performance achievement against the active Battle Plan.
   * Broadcasts the "Pulse" to all connected dashboards.
   */ async calculatePerformanceAchievement(businessDayId) {
        try {
            const plan = await this.battlePlanRepo.findOne({
                where: {
                    businessDayId
                },
                relations: [
                    'items',
                    'items.menuItem',
                    'items.billiardPackage',
                    'items.promo'
                ]
            });
            if (!plan) return null;
            // 1. Calculate Actual Revenue from PAID transactions accurately
            const transactions = await this.transactionRepo.find({
                where: {
                    businessDayId,
                    status: _transactionentity.TransactionStatus.PAID
                }
            });
            const actualRevenue = transactions.reduce((sum, tx)=>sum + Number(tx.grandTotal || 0), 0);
            const achievementPercent = Math.min(100, plan.targetRevenue > 0 ? actualRevenue / plan.targetRevenue * 100 : 0);
            // 2. Map Item Performance
            const itemPerformance = plan.items.map((it)=>{
                const sold = Number(it.soldQuantity || 0);
                const target = Number(it.targetQuantity || 1);
                return {
                    id: it.menuItemId || it.packageId || it.promoId,
                    type: it.menuItemId ? 'CAFE' : it.packageId ? 'BILLIARD' : 'PROMO',
                    name: it.menuItem?.name || it.billiardPackage?.name || it.promo?.name || 'Item',
                    sold,
                    target,
                    percent: Math.min(100, sold / target * 100)
                };
            });
            const pulse = {
                businessDayId,
                actualRevenue,
                targetRevenue: plan.targetRevenue,
                achievementPercent,
                gap: Math.max(0, plan.targetRevenue - actualRevenue),
                items: itemPerformance,
                timestamp: new Date()
            };
            // 3. Broadcast to Socket
            this.eventsGateway.broadcastPerformancePulse(pulse);
            return pulse;
        } catch (err) {
            this.logger.error(`Failed to calculate performance pulse: ${err.message}`);
            return null;
        }
    }
    async calculateStaffNeed(customerCount, billiardTableCount) {
        const settings = await this.settingRepo.findOne({
            where: {}
        });
        const MEJA_PER_WAITER = settings?.aiStaffingRatio || 5;
        // Total establishment tables
        const cafeTableCount = await this.cafeTableRepo.count();
        const totalTables = billiardTableCount + cafeTableCount;
        // Estimate tables based on traffic. Assuming avg group size of 3
        const estimatedTablesOccupied = Math.min(totalTables, Math.ceil(customerCount / 3));
        const staffRecommended = Math.max(Math.ceil(estimatedTablesOccupied / MEJA_PER_WAITER), 2);
        // Get active staff count from Open Shifts
        const openShifts = await this.shiftRepo.find({
            where: {
                status: _shiftentity.ShiftStatus.OPEN
            },
            relations: [
                'user',
                'user.role'
            ]
        });
        const staffDuty = openShifts.filter((s)=>{
            const roleName = s.user?.role?.name?.toUpperCase() || '';
            const permissions = s.user?.role?.permissions || [];
            return [
                'WAITER',
                'WAITERS',
                'KASIR',
                'CASHIER',
                'STAFF'
            ].some((n)=>roleName.includes(n)) || permissions.includes('ORDER_MENU');
        });
        const activeWaiters = staffDuty.length;
        // Check assignment coverage and identify gaps
        const assignedBilliard = new Set();
        const assignedCafe = new Set();
        openShifts.forEach((s)=>{
            if (s.assignedTableIds) {
                s.assignedTableIds.forEach((t)=>{
                    if (t.type === 'BILLIARD') assignedBilliard.add(t.id);
                    else assignedCafe.add(t.id);
                });
            }
        });
        const assignedCount = assignedBilliard.size + assignedCafe.size;
        const coveragePercent = totalTables > 0 ? Math.round(assignedCount / totalTables * 100) : 100;
        let advice = `Kebutuhan Staf: ${staffRecommended} Orang (Establishment: ${totalTables} Meja). `;
        advice += `Status: ${activeWaiters} Staf Aktif. `;
        const isShortage = activeWaiters < staffRecommended;
        const shortageCount = isShortage ? staffRecommended - activeWaiters : 0;
        if (isShortage) {
            advice += `🚨 Kurang ${shortageCount} staf! `;
        } else {
            advice += `✅ Staf cukup. `;
        }
        if (coveragePercent < 100 && totalTables > 0) {
            const gapCount = Math.max(0, totalTables - assignedCount);
            advice += `⚠️ ${gapCount} Meja Belum Tercover (${coveragePercent}%). `;
            try {
                const [allBilliard, allCafe] = await Promise.all([
                    this.tableRepo.find({
                        select: [
                            'id',
                            'tableName'
                        ],
                        where: {
                            status: (0, _typeorm1.Not)(_tableentity.TableStatus.MAINTENANCE)
                        }
                    }),
                    this.cafeTableRepo.find({
                        select: [
                            'id',
                            'tableName'
                        ]
                    })
                ]);
                const missingNames = [
                    ...allBilliard.filter((t)=>!assignedBilliard.has(t.id)).map((t)=>t.tableName),
                    ...allCafe.filter((t)=>!assignedCafe.has(t.id)).map((t)=>t.tableName)
                ].slice(0, 3);
                if (missingNames.length > 0) {
                    advice += `Cek: ${missingNames.join(', ')}...`;
                }
            } catch (e) {}
        } else if (totalTables > 0) {
            advice += `🛡️ Seluruh area tercover.`;
        }
        return {
            staffRecommended,
            activeWaiters,
            shortageCount,
            isShortage,
            coveragePercent,
            unassignedCount: Math.max(0, totalTables - assignedCount),
            staffRecommendation: advice,
            establishmentTables: totalTables
        };
    }
    /**
   * Traffic Prediction using TensorFlow.js (LSTM)
   * High-Performance Cache Wrapper
   */ async predictDailyTraffic() {
        const now = Date.now();
        // 1. Instant Cache Return
        if (this.trafficForecastCache && now - this.trafficForecastCache.timestamp < this.AI_CACHE_TTL_MS) {
            // 2. Background Refresh if getting stale
            if (now - this.trafficForecastCache.timestamp > this.AI_PRE_WARM_MS && !this.isTraining) {
                this.logger.log('Traffic Forecast Cache pre-warm triggered.');
                this.refreshAIForecasts().catch(()=>{});
            }
            return this.trafficForecastCache.data;
        }
        // 3. Sequential if no cache exists (First run experience)
        return this.refreshAIForecasts();
    }
    /**
   * Internal heavy-lifting for AI Forecasting
   */ async refreshAIForecasts() {
        if (this.isTraining) return this.trafficForecastCache?.data;
        this.isTraining = true;
        try {
            this.logger.log('AIService: Deep Re-training LSTM for Daily Strategy...');
            const HISTORY_DAYS_WINDOW = 30;
            const [history, tableCount, metrics] = await Promise.all([
                this.fetchHistoricalData(HISTORY_DAYS_WINDOW),
                this.tableRepo.count({
                    where: {
                        status: (0, _typeorm1.Not)(_tableentity.TableStatus.MAINTENANCE)
                    }
                }),
                this.getDynamicMetrics()
            ]);
            let result;
            if (history.length < 8) {
                const predictedCustomerCount = metrics.avgCust;
                const predictedRevenue = predictedCustomerCount * metrics.avgCheck;
                const staffNeed = await this.calculateStaffNeed(predictedCustomerCount, tableCount);
                result = {
                    predictedCustomerCount,
                    averageCheck: metrics.avgCheck,
                    peakHours: [],
                    staffRecommendation: staffNeed.staffRecommendation,
                    predictedRevenue,
                    tableCount,
                    isHeuristic: true
                };
            } else {
                const prediction = await this.runLSTMPrediction(history);
                const peakHours = await this.calculatePeakHoursFromData(30);
                const staffNeed = await this.calculateStaffNeed(prediction.predictedCustomerCount, tableCount);
                const hourlyTraffic = await this.calculateHourlyTrafficVision(HISTORY_DAYS_WINDOW);
                result = {
                    ...prediction,
                    averageCheck: metrics.avgCheck,
                    tableCount,
                    peakHours: peakHours.length > 0 ? peakHours : [],
                    hourlyTraffic,
                    staffRecommendation: staffNeed.staffRecommendation,
                    isHeuristic: false
                };
            }
            this.trafficForecastCache = {
                data: result,
                timestamp: Date.now()
            };
            this.logger.log(`AI Strategy Cache refreshed successfully. Predicted Revenue: Rp ${result.predictedRevenue?.toLocaleString('id-ID')}`);
            return result;
        } finally{
            this.isTraining = false;
        }
    }
    async fetchHistoricalData(days) {
        const raw = await this.businessDayRepo.createQueryBuilder('bd').leftJoin(_transactionentity.Transaction, 't', 't.businessDayId = bd.id AND t.status = :status', {
            status: 'PAID'
        }).select('CAST(bd.totalRevenue AS FLOAT)', 'revenue').addSelect('COUNT(DISTINCT t.id)', 'customerCount').groupBy('bd.id').orderBy('bd.date', 'DESC').limit(days).getRawMany();
        return raw.reverse(); // Chronological order for LSTM
    }
    async runLSTMPrediction(data) {
        const revenues = data.map((d)=>d.revenue);
        const counts = data.map((d)=>d.customerCount);
        // Normalize
        const maxRev = Math.max(...revenues, 1);
        const maxCount = Math.max(...counts, 1);
        const normRev = revenues.map((r)=>r / maxRev);
        const normCount = counts.map((c)=>c / maxCount);
        // Build LSTM Model
        const model = _tfjs.sequential();
        model.add(_tfjs.layers.lstm({
            units: 20,
            inputShape: [
                7,
                2
            ],
            returnSequences: false
        }));
        model.add(_tfjs.layers.dense({
            units: 2
        }));
        model.compile({
            optimizer: 'adam',
            loss: 'meanSquaredError'
        });
        // Prepare training sequence (sliding window)
        const windowSize = 7;
        const xsArr = [];
        const ysArr = [];
        for(let i = 0; i < normRev.length - windowSize; i++){
            const window = [];
            for(let j = 0; j < windowSize; j++){
                window.push([
                    normRev[i + j],
                    normCount[i + j]
                ]);
            }
            xsArr.push(window);
            ysArr.push([
                normRev[i + windowSize],
                normCount[i + windowSize]
            ]);
        }
        if (xsArr.length === 0) throw new Error('Insufficient window sequences');
        const xs = _tfjs.tensor3d(xsArr);
        const ys = _tfjs.tensor2d(ysArr);
        await model.fit(xs, ys, {
            epochs: 50,
            verbose: 0
        });
        // Predict next
        const lastWindow = [
            xsArr[xsArr.length - 1]
        ];
        const predTensor = model.predict(_tfjs.tensor3d(lastWindow));
        const [predRevNorm, predCountNorm] = Array.from(await predTensor.data());
        const predictedRevenue = predRevNorm * maxRev;
        const predictedCustomerCount = Math.round(predCountNorm * maxCount);
        // Cleanup
        xs.dispose();
        ys.dispose();
        predTensor.dispose();
        return {
            predictedRevenue,
            predictedCustomerCount,
            averageCheck: predictedRevenue / (predictedCustomerCount || 1)
        };
    }
    async calculatePeakHoursFromData(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        // Using EXTRACT(HOUR FROM ...) for PostgreSQL compatibility
        const raw = await this.transactionRepo.createQueryBuilder('t').select('EXTRACT(HOUR FROM t.createdAt)', 'hour').addSelect('COUNT(t.id)', 'count').where('t.createdAt >= :cutoff', {
            cutoff
        }).andWhere('t.status = :status', {
            status: _transactionentity.TransactionStatus.PAID
        }).groupBy('EXTRACT(HOUR FROM t.createdAt)').orderBy('count', 'DESC').limit(3).getRawMany();
        return raw.map((r)=>`${Math.floor(Number(r.hour)).toString().padStart(2, '0')}:00`);
    }
    async calculateHourlyTrafficVision(days) {
        const cutoffSeven = new Date();
        cutoffSeven.setDate(cutoffSeven.getDate() - 7);
        const cutoffTotal = new Date();
        cutoffTotal.setDate(cutoffTotal.getDate() - days);
        // Fetch both recent and older data
        const [recentRaw, totalRaw] = await Promise.all([
            this.transactionRepo.createQueryBuilder('t').select('EXTRACT(HOUR FROM t.createdAt)', 'hour').addSelect('COUNT(t.id)', 'count').where('t.createdAt >= :cutoff', {
                cutoff: cutoffSeven
            }).andWhere('t.status = :status', {
                status: _transactionentity.TransactionStatus.PAID
            }).groupBy('EXTRACT(HOUR FROM t.createdAt)').getRawMany(),
            this.transactionRepo.createQueryBuilder('t').select('EXTRACT(HOUR FROM t.createdAt)', 'hour').addSelect('COUNT(t.id)', 'count').where('t.createdAt >= :cutoff', {
                cutoff: cutoffTotal
            }).andWhere('t.status = :status', {
                status: _transactionentity.TransactionStatus.PAID
            }).groupBy('EXTRACT(HOUR FROM t.createdAt)').getRawMany()
        ]);
        const vision = [];
        for(let h = 0; h < 24; h++){
            const hStr = h.toString();
            const recent = recentRaw.find((r)=>Math.floor(Number(r.hour)) === h);
            const total = totalRaw.find((r)=>Math.floor(Number(r.hour)) === h);
            const recentCount = recent ? Number(recent.count) / 7 : 0;
            const totalCount = total ? Number(total.count) / days : 0;
            // Weighting: 70% Recent (Last 7 days), 30% Total Average
            const weighted = recentCount * 0.7 + totalCount * 0.3;
            vision.push({
                hour: `${h.toString().padStart(2, '0')}:00`,
                count: Math.round(weighted * 10) / 10
            });
        }
        return vision;
    }
    async generateDailyStrategyBrief() {
        this.logger.log('Generating Daily AI Strategy Brief...');
        try {
            const prediction = await this.predictDailyTraffic();
            const strategyMatch = await this.calculateTargetMix(prediction.predictedRevenue);
            // Create BattlePlan for today if not exists
            // Look for active business day
            const activeBday = await this.businessDayRepo.findOne({
                where: {
                    isClosed: false
                },
                order: {
                    date: 'DESC'
                }
            });
            if (!activeBday) {
                this.logger.warn('No active business day found for strategy brief.');
                return;
            }
            let strategyBrief = `Target Rev: Rp ${prediction.predictedRevenue.toLocaleString()}. ` + `Est. ${prediction.predictedCustomerCount} pax (Avg: Rp ${Math.round(prediction.averageCheck).toLocaleString()}). `;
            if (prediction.peakHours && prediction.peakHours.length > 0) {
                const peakSummary = prediction.peakHours.slice(0, 2).join(' & ');
                strategyBrief += `PEAK ALERT: Intensitas tinggi pada jam ${peakSummary}. `;
                strategyBrief += `Lakukan broadcast promo 30 menit sebelum peak! `;
            } else {
                strategyBrief += `Trafik diprediksi stabil sepanjang hari. `;
            }
            strategyBrief += `Prioritaskan ${strategyMatch.items.filter((i)=>i.type === 'BILLIARD').length} Paket Billiard untuk filling occupancy.`;
            await this.createOrUpdateBattlePlan({
                businessDayId: activeBday.id,
                targetRevenue: prediction.predictedRevenue,
                items: strategyMatch.items.map((r)=>({
                        id: r.id,
                        type: r.type,
                        targetQuantity: r.targetQuantity,
                        aiLabel: r.targetQuantity > 50 ? '🔥 Laris' : '🚀 Upsell'
                    }))
            });
            // Update the plan with the text brief (need to add field to createOrUpdateBattlePlan or directly)
            const plan = await this.battlePlanRepo.findOne({
                where: {
                    businessDayId: activeBday.id
                }
            });
            if (plan) {
                plan.aiStrategyBrief = strategyBrief;
                await this.battlePlanRepo.save(plan);
            }
            this.eventsGateway.battlePlanUpdated({
                type: 'STRATEGY_BRIEF',
                brief: strategyBrief
            });
            this.logger.log('Daily Strategy Brief published.');
        } catch (err) {
            this.logger.error(`Failed to generate daily strategy: ${err.message}`);
        }
    }
    async getCurrentBattlePlan(businessDayId) {
        return this.battlePlanRepo.findOne({
            where: {
                businessDayId
            },
            relations: [
                'items',
                'items.menuItem',
                'items.billiardPackage',
                'items.promo'
            ],
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async createOrUpdateBattlePlan(data) {
        let plan = await this.battlePlanRepo.findOne({
            where: {
                businessDayId: data.businessDayId
            }
        });
        if (!plan) {
            plan = this.battlePlanRepo.create({
                businessDayId: data.businessDayId,
                targetRevenue: data.targetRevenue,
                status: _battleplanentity.BattlePlanStatus.DRAFT
            });
        } else {
            plan.targetRevenue = data.targetRevenue;
        }
        await this.battlePlanRepo.save(plan);
        // Clear existing items if any and recreate based on simulation/admin adjustments
        if (data.items) {
            const existingItems = await this.battlePlanItemRepo.find({
                where: {
                    battlePlanId: plan.id
                }
            });
            await this.battlePlanItemRepo.delete({
                battlePlanId: plan.id
            });
            const items = data.items.map((item)=>{
                const mId = item.type === 'CAFE' ? item.id : item.menuItemId;
                const pId = item.type === 'BILLIARD' ? item.id : item.packageId;
                const prId = item.type === 'PROMO' ? item.id : item.promoId;
                // Find existing to preserve progress
                const existing = existingItems.find((ei)=>mId && ei.menuItemId === mId || pId && ei.packageId === pId || prId && ei.promoId === prId);
                return this.battlePlanItemRepo.create({
                    battlePlanId: plan.id,
                    menuItemId: mId,
                    packageId: pId,
                    promoId: prId,
                    targetQuantity: item.targetQuantity,
                    soldQuantity: existing ? existing.soldQuantity : item.soldQuantity || 0,
                    aiLabel: item.aiLabel || 'Neutral'
                });
            });
            await this.battlePlanItemRepo.save(items);
        }
        const resultPlan = await this.getCurrentBattlePlan(data.businessDayId);
        if (!resultPlan) throw new Error('Battle plan creation or update failed');
        // Notify all clients that the plan structure has changed
        this.eventsGateway.battlePlanUpdated({
            type: 'UPDATED',
            battlePlanId: resultPlan.id,
            businessDayId: data.businessDayId
        });
        return resultPlan;
    }
    async reoptimizeBattlePlan(businessDayId) {
        const plan = await this.getCurrentBattlePlan(businessDayId);
        if (!plan) throw new Error('No active battle plan found to re-optimize.');
        const realizedRevenue = plan.items.reduce((sum, it)=>{
            const price = it.menuItem ? Number(it.menuItem.price || 0) : it.billiardPackage ? BP_FALLBACK_PRICE(it.billiardPackage) : it.promo ? Number(it.promo.ruleJson?.fixedPrice || 0) : 0;
            return sum + it.soldQuantity * price;
        }, 0);
        const remainingTarget = Math.max(0, plan.targetRevenue - realizedRevenue);
        if (remainingTarget === 0) return plan;
        // Recalculate based on remaining target
        const simulation = await this.calculateTargetMix(remainingTarget);
        // Update items: current sold + new recommended
        const updatedItems = simulation.items.map((r)=>{
            const existing = plan.items.find((it)=>r.type === 'CAFE' && it.menuItemId === r.id || r.type === 'BILLIARD' && it.packageId === r.id || r.type === 'PROMO' && it.promoId === r.id);
            const currentSold = existing ? existing.soldQuantity : 0;
            return {
                id: r.id,
                type: r.type,
                targetQuantity: currentSold + r.targetQuantity,
                soldQuantity: currentSold,
                aiLabel: '🔄 Re-optimized'
            };
        });
        // Also include items already sold that might not be in the new recommendation
        plan.items.forEach((it)=>{
            const isAlreadyInUpdate = updatedItems.find((ui)=>it.menuItemId && ui.type === 'CAFE' && ui.id === it.menuItemId || it.packageId && ui.type === 'BILLIARD' && ui.id === it.packageId || it.promoId && ui.type === 'PROMO' && ui.id === it.promoId);
            if (!isAlreadyInUpdate) {
                updatedItems.push({
                    id: it.menuItemId || it.packageId || it.promoId,
                    type: it.menuItemId ? 'CAFE' : it.packageId ? 'BILLIARD' : 'PROMO',
                    targetQuantity: it.targetQuantity,
                    soldQuantity: it.soldQuantity,
                    aiLabel: it.aiLabel
                });
            }
        });
        const result = await this.createOrUpdateBattlePlan({
            businessDayId,
            targetRevenue: plan.targetRevenue,
            items: updatedItems
        });
        this.eventsGateway.battlePlanUpdated({
            type: 'RE_OPTIMIZED',
            message: 'AI telah mengoptimalkan ulang target berdasarkan tren penjualan saat ini.'
        });
        return result;
    }
    async generatePerformanceReport(businessDayId) {
        const plan = await this.getCurrentBattlePlan(businessDayId);
        if (!plan) return {
            analysis: 'No battle plan found for this day.'
        };
        const realizedRevenue = plan.items.reduce((sum, it)=>{
            const price = it.menuItem ? Number(it.menuItem.price || 0) : it.billiardPackage ? Number(it.billiardPackage.price) || Number(it.billiardPackage.minutePrice) * 60 : 0;
            return sum + it.soldQuantity * price;
        }, 0);
        const revenueGap = plan.targetRevenue - realizedRevenue;
        const itemsReached = plan.items.filter((it)=>it.soldQuantity >= it.targetQuantity).length;
        const prompts = await this.upsellPromptRepo.find({
            where: {
                businessDayId
            }
        });
        const conversionCount = prompts.filter((p)=>p.isConverted).length;
        const strikeRate = prompts.length > 0 ? conversionCount / prompts.length * 100 : 0;
        const fmt = (n)=>`Rp ${Math.round(n).toLocaleString('id-ID')}`;
        const waiterStats = await this.getWaiterPerformance(businessDayId);
        const topWaiter = waiterStats.length > 0 ? waiterStats[0] : null;
        let analysis = `### 📊 AI Performance Analysis Report\n\n`;
        if (topWaiter) {
            analysis += `> [!TIP]\n`;
            analysis += `> **Intelligent Match**: Berdasarkan data hari ini, **${topWaiter.staffName}** memiliki Strike Rate tertinggi. Pertimbangkan untuk menugaskan beliau pada meja VVIP untuk item high-ticket.\n\n`;
        }
        analysis += `**Revenue Progress**: ${fmt(realizedRevenue)} / ${fmt(plan.targetRevenue)}\n`;
        analysis += `**Target Achievement**: ${Math.round(realizedRevenue / plan.targetRevenue * 100)}%\n`;
        analysis += `**Conversion Rate (Strike Rate)**: ${Math.round(strikeRate)}%\n\n`;
        if (revenueGap > 0) {
            analysis += `#### 🔴 Gaps Identified:\n`;
            if (strikeRate < 15) {
                analysis += `- **Low Conversion**: Performa upselling tim rendah (${Math.round(strikeRate)}%). Ini adalah faktor utama melesetnya target.\n`;
            }
            if (itemsReached < plan.items.length / 2) {
                analysis += `- **Inventory/Traffic Mismatch**: Sebagian besar item target tidak tercapai. Kemungkinan trafik riil lebih rendah dari model LSTM pagi ini.\n`;
            }
        } else {
            analysis += `#### 🟢 Success Summary:\n- **Mission Accomplished**: Target harian terlampaui. Efektivitas upselling tim sangat baik.\n`;
        }
        analysis += `\n**Rekomendasi Esok**: ${revenueGap > 0 ? 'Tingkatkan intensitas upselling di jam sibuk.' : 'Pertahankan strategi mix saat ini.'}`;
        // Return merged data to satisfy both Analysis and Real-time Pulse
        const pulse = await this.calculatePerformanceAchievement(businessDayId);
        return {
            ...pulse,
            analysis
        };
    }
    async broadcastUpsellPrompt(tableId, tableName) {
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                date: 'DESC'
            }
        });
        if (!activeBday) return;
        const plan = await this.getCurrentBattlePlan(activeBday.id);
        if (!plan || plan.status !== _battleplanentity.BattlePlanStatus.PUBLISHED || !plan.items || plan.items.length === 0) return;
        // AI Self-Learning: Select item using DQN
        const state = await this.getDQNState();
        let bestIndex = 0;
        // Filter logic: If billiard table already in session, exclude other billiard packages
        let items = plan.items.filter((it)=>it.soldQuantity < it.targetQuantity);
        const billiardTable = await this.tableRepo.findOne({
            where: {
                id: tableId
            }
        });
        if (billiardTable && billiardTable.status === _tableentity.TableStatus.IN_USE) {
            // Don't suggest other billiard packages if they just started one
            items = items.filter((it)=>!it.packageId);
            this.logger.log(`Table ${tableName} is in session. Filtering out Billiard Packages from AI recommendations.`);
        }
        const candidates = items.sort((a, b)=>a.soldQuantity / a.targetQuantity - b.soldQuantity / b.targetQuantity).slice(0, 5);
        if (candidates.length === 0) return;
        try {
            const stateTensor = _tfjs.tensor2d([
                state
            ]);
            const prediction = this.dqnModel.predict(stateTensor);
            const scores = await prediction.data();
            let maxScore = -Infinity;
            for(let i = 0; i < candidates.length; i++){
                if (scores[i] > maxScore) {
                    maxScore = scores[i];
                    bestIndex = i;
                }
            }
            stateTensor.dispose();
            prediction.dispose();
        } catch (err) {
            this.logger.error(`DQN Selection failed: ${err.message}. Fallback to highest gap.`);
        }
        const target = candidates[bestIndex];
        const itemName = target.menuItem?.name || target.billiardPackage?.name || target.promo?.name || 'Item';
        const promptMessage = `${tableName} baru saja duduk. Coba tawarkan ${itemName} (AI Target)!`;
        // Save prompt log for conversion tracking
        const promptRecord = new _upsellpromptentity.UpsellPrompt();
        promptRecord.businessDayId = activeBday.id;
        promptRecord.menuItemId = Number(target.menuItemId) || null;
        promptRecord.packageId = Number(target.packageId) || null;
        promptRecord.promoId = Number(target.promoId) || null;
        promptRecord.tableId = tableId;
        promptRecord.tableName = tableName;
        promptRecord.message = promptMessage;
        await this.upsellPromptRepo.save(promptRecord);
        // Intelligent Staff Highlighting: Find Top Performer for this item
        const waiterStats = await this.getWaiterPerformance(activeBday.id);
        const topPerformer = waiterStats.filter((s)=>s.revenue > 0).sort((a, b)=>b.teamStrikeRate - a.teamStrikeRate)[0];
        this.eventsGateway.battlePlanUpdated({
            type: 'UPSELL_PROMPT',
            id: promptRecord.id,
            message: promptMessage,
            tableName,
            menuItemName: itemName,
            menuItemId: target.menuItemId,
            packageId: target.packageId,
            promoId: target.promoId,
            referenceWaiter: topPerformer ? topPerformer.staffName : null,
            referenceStrikeRate: topPerformer ? Math.round(topPerformer.teamStrikeRate) : null
        });
        this.logger.log(`Upsell prompt broadcasted for table ${tableName}: ${promptMessage}`);
    }
    async manualBroadcastItem(itemId, type) {
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                isClosed: false
            },
            order: {
                date: 'DESC'
            }
        });
        if (!activeBday) return {
            success: false,
            message: 'No active business day'
        };
        let itemName = '';
        if (type === 'CAFE') {
            const item = await this.menuItemRepo.findOne({
                where: {
                    id: itemId
                }
            });
            itemName = item?.name || 'Item';
        } else if (type === 'BILLIARD') {
            const pkg = await this.billiardPackageRepo.findOne({
                where: {
                    id: itemId
                }
            });
            itemName = `Paket ${pkg?.name || 'Billiard'}`;
        } else {
            const promo = await this.promoRepo.findOne({
                where: {
                    id: itemId
                }
            });
            itemName = `Promo ${promo?.name || 'Spesial'}`;
        }
        const message = `📢 PROMO AI: Segera tawarkan ${itemName} ke seluruh tamu yang sedang aktif!`;
        // Save to DB for conversion tracking
        const promptRecord = new _upsellpromptentity.UpsellPrompt();
        promptRecord.businessDayId = Number(activeBday.id);
        promptRecord.menuItemId = type === 'CAFE' ? Number(itemId) : null;
        promptRecord.packageId = type === 'BILLIARD' ? Number(itemId) : null;
        promptRecord.promoId = type === 'PROMO' ? Number(itemId) : null;
        promptRecord.tableId = 0;
        promptRecord.tableName = 'SEMUA MEJA';
        promptRecord.isManual = true;
        promptRecord.message = message;
        await this.upsellPromptRepo.save(promptRecord);
        // Emit to everyone
        this.eventsGateway.battlePlanUpdated({
            type: 'UPSELL_PROMPT',
            id: promptRecord.id,
            message: message,
            tableName: 'SEMUA MEJA',
            menuItemId: type === 'CAFE' ? itemId : null,
            packageId: type === 'BILLIARD' ? itemId : null,
            promoId: type === 'PROMO' ? itemId : null,
            menuItemName: itemName,
            isManual: true
        });
        return {
            success: true,
            message: `Broadcast sent for ${itemName}`,
            promptId: promptRecord.id
        };
    }
    async acknowledgePrompt(promptId) {
        const prompt = await this.upsellPromptRepo.findOne({
            where: {
                id: promptId
            }
        });
        if (prompt) {
            prompt.isAcknowledged = true;
            prompt.ackCount = (prompt.ackCount || 0) + 1;
            await this.upsellPromptRepo.save(prompt);
            // Notify Orchestrator of the engagement update
            this.eventsGateway.battlePlanUpdated({
                type: 'CAMPAIGN_UPDATE',
                promptId: prompt.id,
                ackCount: prompt.ackCount,
                conversionValue: Number(prompt.conversionValue || 0)
            });
        }
        return {
            success: true
        };
    }
    async getDailyMissionReport(businessDayId) {
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                id: businessDayId
            }
        });
        if (!activeBday) return null;
        // 1. Fetch performance data
        const performance = await this.calculatePerformanceAchievement(businessDayId);
        const coaching = await this.getStaffCoachingTips(businessDayId);
        if (!performance || !coaching) return null;
        // 2. Calculate Shift Score (Weighted)
        // Achievement: 50%, ROI: 30%, Strike Rate: 20%
        const achievementScore = Math.min(performance.achievementPercent / 100 * 50, 50);
        const strikeRate = coaching.currentStrikeRate || 0;
        const benchmark = coaching.benchmark || 20;
        const roiScore = Math.min(strikeRate / 40 * 30, 30);
        const strikeRateScore = Math.min(strikeRate / benchmark * 20, 20);
        const shiftScore = Math.round(achievementScore + roiScore + strikeRateScore);
        // 3. Aggregate ROI
        const campaignStats = await this.getActiveCampaignStats(businessDayId);
        let totalRoiValue = 0;
        Object.values(campaignStats).forEach((stat)=>{
            totalRoiValue += stat.conversionValue || 0;
        });
        // 4. Automated Executive Commentary
        let commentary = '';
        if (performance.achievementPercent >= 100) {
            commentary = 'Misi Sukses! Target pendapatan tercapai dengan bantuan optimasi AI.';
        } else if (performance.achievementPercent > 80) {
            commentary = 'Performa solid, hampir menyentuh target. AI ROI memberikan kontribusi signifikan.';
        } else {
            commentary = 'Hari yang menantang. Tim perlu fokus pada rekomendasi AI untuk menutup celah pendapatan.';
        }
        if (strikeRate < benchmark * 0.8) {
            commentary += ' Catatan: Strike rate staf di bawah rata-rata, butuh briefing upselling.';
        }
        // 5. New Phase 39: Waiter MVP & Intensity Stats
        const waiterPerformance = await this.getWaiterPerformance(businessDayId);
        const topWaiter = waiterPerformance.length > 0 ? waiterPerformance[0] : null;
        const intensityPrediction = await this.getPeakIntensityPrediction();
        const intensityStats = {
            score: intensityPrediction.score,
            label: intensityPrediction.label,
            expectedVelocity: intensityPrediction.expectedVelocity,
            currentVelocity: intensityPrediction.currentVelocity
        };
        if (topWaiter && topWaiter.aiRoi > 0) {
            commentary += ` MVP hari ini adalah ${topWaiter.userName} dengan kontribusi ROI ${topWaiter.aiRoi.toLocaleString('id-ID')}.`;
        }
        return {
            score: shiftScore,
            grade: shiftScore >= 90 ? 'S' : shiftScore >= 80 ? 'A' : shiftScore >= 70 ? 'B' : 'C',
            achievement: performance.achievementPercent,
            totalRevenue: performance.actualRevenue,
            targetRevenue: performance.targetRevenue,
            aiRoi: totalRoiValue,
            strikeRate: strikeRate,
            topWaiter: topWaiter ? {
                name: topWaiter.userName,
                roi: topWaiter.aiRoi
            } : null,
            intensityStats,
            commentary
        };
    }
    async getStaffCoachingTips(businessDayId) {
        const activeBday = await this.businessDayRepo.findOne({
            where: {
                id: businessDayId
            }
        });
        if (!activeBday) return {
            tips: [],
            anomalies: []
        };
        const prompts = await this.upsellPromptRepo.find({
            where: {
                businessDayId
            },
            order: {
                createdAt: 'DESC'
            }
        });
        const conversionCount = prompts.filter((p)=>p.isConverted).length;
        const currentStrikeRate = prompts.length > 0 ? conversionCount / prompts.length * 100 : 0;
        // Get historical average strike rate (last 7 days from history helper)
        const history = await this.getBattlePlanHistory(7);
        const avgStrikeRate = history.length > 0 ? history.reduce((sum, h)=>sum + h.strikeRate, 0) / history.length : 20; // Default benchmark
        const tips = [];
        const anomalies = [];
        // New: Intensity-Aware Coaching
        const intensity = await this.getPeakIntensityPrediction();
        if (intensity.score >= 7) {
            tips.push({
                type: 'STRATEGY',
                message: `🔥 High Intensity Detected (${intensity.label}). Pastikan tim menggunakan fitur Broardcast untuk item cepat saji guna menjaga flow transaksi.`
            });
        }
        // 1. Strike Rate Analysis
        if (prompts.length > 5) {
            if (currentStrikeRate < avgStrikeRate * 0.7) {
                tips.push({
                    type: 'URGENT',
                    message: `Strike rate tim sedang rendah (${Math.round(currentStrikeRate)}%). Tim perlu lebih proaktif menawarkan item dari Battle Plan.`
                });
            } else if (currentStrikeRate > avgStrikeRate * 1.2) {
                tips.push({
                    type: 'POSITIVE',
                    message: `Performa upselling luar biasa! Strike rate di atas rata-rata (${Math.round(currentStrikeRate)}%). Pertahankan momentum!`
                });
            }
        }
        // 2. Anomaly Detection: Cold Streaks
        // Check for last transaction time via Orders (Cafe/Billiard)
        // For simplicity, we check if any prompt was converted in the last 2 hours
        const lastConverted = prompts.find((p)=>p.isConverted);
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        const now = new Date();
        if (lastConverted && now.getTime() - new Date(lastConverted.convertedAt).getTime() > TWO_HOURS_MS) {
            anomalies.push({
                type: 'COLD_STREAK',
                message: `Deteksi Anomali: Tidak ada konversi upsell selama lebih dari 2 jam terakhir. Cek semangat tim di lapangan.`
            });
        }
        // 3. Item-Specific Tips
        const plan = await this.battlePlanRepo.findOne({
            where: {
                businessDayId,
                status: _battleplanentity.BattlePlanStatus.PUBLISHED
            },
            relations: [
                'items',
                'items.menuItem',
                'items.billiardPackage'
            ]
        });
        if (plan && plan.items) {
            const slowItems = plan.items.filter((it)=>it.soldQuantity < it.targetQuantity * 0.2 && it.targetQuantity > 10);
            if (slowItems.length > 0) {
                const itemName = slowItems[0].menuItem?.name || slowItems[0].billiardPackage?.name;
                tips.push({
                    type: 'STRATEGY',
                    message: `${itemName} tertinggal jauh dari target. Berikan insentif kecil bagi staf yang berhasil menjual item ini.`
                });
            }
        }
        return {
            tips,
            anomalies,
            currentStrikeRate: Math.round(currentStrikeRate),
            benchmark: Math.round(avgStrikeRate)
        };
    }
    async getBattlePlanHistory(limit = 7) {
        const plans = await this.battlePlanRepo.find({
            order: {
                createdAt: 'DESC'
            },
            take: limit,
            relations: [
                'items',
                'businessDay',
                'items.menuItem',
                'items.billiardPackage',
                'items.promo'
            ]
        });
        const history = [];
        for (const plan of plans){
            // Calculate realized revenue for this plan
            const realizedRevenue = plan.items.reduce((sum, it)=>{
                const price = it.menuItem ? Number(it.menuItem.price || 0) : it.billiardPackage ? BP_FALLBACK_PRICE(it.billiardPackage) : it.promo ? Number(it.promo.ruleJson?.fixedPrice || 0) : 0;
                return sum + it.soldQuantity * price;
            }, 0);
            // Calculate ROI from Prompts in this business day
            const prompts = await this.upsellPromptRepo.find({
                where: {
                    businessDayId: plan.businessDayId
                }
            });
            const totalROI = prompts.reduce((sum, p)=>sum + Number(p.conversionValue || 0), 0);
            const conversionCount = prompts.filter((p)=>p.isConverted).length;
            const strikeRate = prompts.length > 0 ? conversionCount / prompts.length * 100 : 0;
            history.push({
                id: plan.id,
                date: plan.businessDay?.date || plan.createdAt,
                targetRevenue: Number(plan.targetRevenue),
                actualRevenue: realizedRevenue,
                roi: totalROI,
                strikeRate: Math.round(strikeRate),
                achievement: Math.round(realizedRevenue / plan.targetRevenue * 100)
            });
        }
        return history.reverse(); // Chronological for charts
    }
    async getActiveCampaignStats(businessDayId) {
        const prompts = await this.upsellPromptRepo.find({
            where: {
                businessDayId
            },
            select: [
                'id',
                'ackCount',
                'conversionValue'
            ]
        });
        const stats = {};
        prompts.forEach((p)=>{
            if (p.ackCount > 0 || Number(p.conversionValue) > 0) {
                stats[p.id] = {
                    ackCount: p.ackCount,
                    conversionValue: Number(p.conversionValue)
                };
            }
        });
        return stats;
    }
    async getWaiterPerformance(businessDayId) {
        let activeBday;
        if (businessDayId) {
            activeBday = await this.businessDayRepo.findOne({
                where: {
                    id: businessDayId
                }
            });
        } else {
            activeBday = await this.businessDayRepo.findOne({
                where: {
                    isClosed: false
                },
                order: {
                    date: 'DESC'
                }
            });
        }
        if (!activeBday) return [];
        const plan = await this.getCurrentBattlePlan(activeBday.id);
        if (!plan || !plan.items || plan.items.length === 0) return [];
        const targetItemIds = plan.items.map((it)=>it.menuItemId);
        // Fetch all OrderItems for this business day that are in the Battle Plan
        // Using a simple date filter. Ideally, we filter by businessDayId if available in OrderItem.
        const items = await this.orderItemRepo.find({
            where: {
                menuItemId: (0, _typeorm1.In)(targetItemIds),
                createdAt: (0, _typeorm1.MoreThanOrEqual)(activeBday.startTime || activeBday.date),
                status: (0, _typeorm1.Not)(_orderitementity.OrderItemStatus.CANCELLED)
            },
            relations: [
                'createdBy',
                'menuItem'
            ]
        });
        const stats = {};
        for (const item of items){
            if (!item.createdBy) continue;
            const userId = item.createdBy.id;
            if (!stats[userId]) {
                stats[userId] = {
                    userId: userId,
                    userName: item.createdBy.name,
                    totalSales: 0,
                    revenue: 0,
                    items: {}
                };
            }
            stats[userId].totalSales += item.quantity;
            stats[userId].revenue += Number(item.priceAtOrder) * item.quantity;
            const mName = item.menuItem.name;
            stats[userId].items[mName] = (stats[userId].items[mName] || 0) + item.quantity;
        }
        // Calculate Strike Rate from UpsellPrompts
        const prompts = await this.upsellPromptRepo.find({
            where: {
                businessDayId: activeBday.id
            }
        });
        const conversionCount = prompts.filter((p)=>p.isConverted).length;
        const totalPrompts = prompts.length;
        const teamStrikeRate = totalPrompts > 0 ? conversionCount / totalPrompts * 100 : 0;
        return Object.values(stats).sort((a, b)=>(b.aiRoi || 0) - (a.aiRoi || 0));
    }
    /**
   * Phase 38: Peak Intensity Prediction
   * Calculates a "Heat Level" (1-10) for upcoming traffic
   */ async getPeakIntensityPrediction() {
        try {
            const now = new Date();
            const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
            const recentTxCount = await this.transactionRepo.count({
                where: {
                    createdAt: (0, _typeorm1.MoreThanOrEqual)(fourHoursAgo),
                    status: _transactionentity.TransactionStatus.PAID
                }
            });
            const vision = await this.calculateHourlyTrafficVision(30);
            const nextHour = (now.getHours() + 1) % 24;
            const nextHour2 = (now.getHours() + 2) % 24;
            const avgNext = (vision[nextHour]?.count || 0.5) + (vision[nextHour2]?.count || 0.5);
            const currentVelocity = recentTxCount / 4;
            // Score: Current velocity vs predicted average velocity
            const ratio = currentVelocity / (Math.max(avgNext, 1) / 2);
            const intensityScore = Math.min(10, Math.max(1, Math.round(ratio * 5)));
            let label = 'NORMAL';
            if (intensityScore >= 8) label = 'CRITICAL';
            else if (intensityScore >= 6) label = 'HIGH';
            else if (intensityScore >= 4) label = 'STEADY';
            return {
                score: intensityScore,
                label,
                currentVelocity: Math.round(currentVelocity * 10) / 10,
                expectedVelocity: Math.round(avgNext / 2 * 10) / 10,
                timestamp: new Date()
            };
        } catch (err) {
            this.logger.error(`Failed to predict intensity: ${err.message}`);
            return {
                score: 1,
                label: 'UNKNOWN',
                currentVelocity: 0,
                expectedVelocity: 0
            };
        }
    }
    async publishBattlePlan(planId) {
        const plan = await this.battlePlanRepo.findOne({
            where: {
                id: planId
            },
            relations: [
                'items',
                'items.menuItem',
                'items.billiardPackage'
            ]
        });
        if (!plan) throw new Error('Battle Plan not found');
        plan.status = _battleplanentity.BattlePlanStatus.PUBLISHED;
        const saved = await this.battlePlanRepo.save(plan);
        // Notify all clients (Widgets) that a NEW or UPDATED plan is active
        this.eventsGateway.battlePlanUpdated({
            type: 'PUBLISHED',
            message: 'Battle Plan telah diperbarui oleh Admin.',
            battlePlan: saved
        });
        return saved;
    }
    async updateSoldQuantities(menuItemId, businessDayId, quantity, transactionId, tableId, packageId, userId, promoId) {
        const plan = await this.battlePlanRepo.findOne({
            where: {
                businessDayId,
                status: _battleplanentity.BattlePlanStatus.PUBLISHED
            },
            relations: [
                'items'
            ]
        });
        if (!plan) return;
        // --- PHASE 38: ROI ATTRIBUTION HARDENING (Enhanced with User Tracking) ---
        // Look for ANY prompt (manual or automatic) in the last 30 minutes for this item
        const windowStart = new Date(Date.now() - 30 * 60 * 1000);
        const recentPrompts = await this.upsellPromptRepo.find({
            where: [
                {
                    menuItemId: menuItemId ? Number(menuItemId) : (0, _typeorm1.IsNull)(),
                    packageId: packageId ? Number(packageId) : (0, _typeorm1.IsNull)(),
                    businessDayId,
                    tableId: tableId || 0,
                    createdAt: (0, _typeorm1.MoreThanOrEqual)(windowStart)
                },
                {
                    menuItemId: menuItemId ? Number(menuItemId) : (0, _typeorm1.IsNull)(),
                    packageId: packageId ? Number(packageId) : (0, _typeorm1.IsNull)(),
                    businessDayId,
                    tableId: 0,
                    createdAt: (0, _typeorm1.MoreThanOrEqual)(windowStart)
                }
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        if (recentPrompts.length > 0) {
            // Attribute to the MOST RECENT prompt for this specific item/table context
            const targetPrompt = recentPrompts[0];
            targetPrompt.isConverted = true;
            targetPrompt.convertedAt = new Date();
            if (transactionId) targetPrompt.transactionId = transactionId;
            // Track who converted it
            if (userId) {
                targetPrompt.convertedByUserId = userId;
                const staff = await this.userRepo.findOne({
                    where: {
                        id: userId
                    }
                });
                if (staff) targetPrompt.convertedByUserName = staff.name;
            }
            // Calculate dynamic value
            let itemPrice = 0;
            if (menuItemId) {
                const mi = await this.menuItemRepo.findOne({
                    where: {
                        id: menuItemId
                    }
                });
                itemPrice = Number(mi?.price || 0);
            } else if (packageId) {
                const bp = await this.billiardPackageRepo.findOne({
                    where: {
                        id: packageId
                    }
                });
                itemPrice = BP_FALLBACK_PRICE(bp);
            }
            const addedValue = quantity * itemPrice;
            targetPrompt.conversionValue = Number(targetPrompt.conversionValue || 0) + addedValue;
            await this.upsellPromptRepo.save(targetPrompt);
            // Broadcast Update to Orchestrator
            this.eventsGateway.battlePlanUpdated({
                type: 'CAMPAIGN_UPDATE',
                promptId: targetPrompt.id,
                ackCount: targetPrompt.ackCount,
                conversionValue: Number(targetPrompt.conversionValue)
            });
            // Phase 39: Live Leaderboard Broadcast
            const waiterStats = await this.getWaiterPerformance(plan.businessDayId);
            this.eventsGateway.battlePlanUpdated({
                type: 'WAITER_STATS_UPDATE',
                stats: waiterStats
            });
            this.logger.log(`AI ROI: +Rp ${addedValue.toLocaleString()} attributed to Prompt ID ${targetPrompt.id} (Multi-attribution active)`);
            // DQN Learning: Record conversion reward
            const state = await this.getDQNState();
            this.recordExperience(state, 1, 1);
        }
        // Update Progress
        const item = plan.items.find((i)=>menuItemId && i.menuItemId === menuItemId || packageId && i.packageId === packageId || promoId && i.promoId === promoId);
        if (item) {
            item.soldQuantity += quantity;
            await this.battlePlanItemRepo.save(item);
            this.eventsGateway.battlePlanUpdated({
                battlePlanId: plan.id,
                menuItemId: item.menuItemId,
                packageId: item.packageId,
                soldQuantity: item.soldQuantity,
                targetQuantity: item.targetQuantity
            });
            this.logger.log(`AI Progress: Updated soldQuantity for target item: ${item.soldQuantity}`);
            // Target Achievement Celebration
            if (item.soldQuantity >= item.targetQuantity && item.soldQuantity - quantity < item.targetQuantity) {
                this.eventsGateway.battlePlanUpdated({
                    type: 'TARGET_REACHED',
                    message: `🎯 BATTLE PLAN: Target penjualan ${item.menuItem?.name || item.billiardPackage?.name || 'Item'} telah tercapai!`,
                    menuItemId: item.menuItemId,
                    packageId: item.packageId
                });
            }
        }
    }
    getHardwareId() {
        try {
            return (0, _nodemachineid.machineIdSync)();
        } catch (err) {
            this.logger.error(`Failed to get Machine ID: ${err.message}`);
            return 'UNKNOWN_HWID';
        }
    }
    async verifyLicense() {
        const hwid = this.getHardwareId();
        // Logic to verify license against HWID
        // For now, always return true as requested (placeholder for production logic)
        return true;
    }
    // Phase 10: Market Basket Analysis (MBA)
    async discoverComboRules() {
        this.logger.log('AI MBA: Mining transaction history for item affinities...');
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const transactions = await this.transactionRepo.find({
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(ninetyDaysAgo),
                status: _transactionentity.TransactionStatus.PAID
            },
            relations: [
                'orderItems',
                'orderItems.menuItem',
                'orderItems.menuItem.category'
            ]
        });
        if (transactions.length < 5) {
            // Lower threshold for dev
            this.logger.warn('MBA: Insufficient transaction history for mining.');
            return [];
        }
        const itemSupport = {};
        const pairSupport = {};
        const totalTransactions = transactions.length;
        transactions.forEach((t)=>{
            // Include both menu items and the billiard package in the basket
            const items = t.orderItems.map((oi)=>`menu_${oi.menuItemId}`);
            if (t.packageId) {
                items.push(`pkg_${t.packageId}`);
            }
            const uniqueItems = Array.from(new Set(items));
            uniqueItems.forEach((id)=>{
                itemSupport[id] = (itemSupport[id] || 0) + 1;
            });
            for(let i = 0; i < uniqueItems.length; i++){
                for(let j = i + 1; j < uniqueItems.length; j++){
                    const pair = [
                        uniqueItems[i],
                        uniqueItems[j]
                    ].sort().join(',');
                    pairSupport[pair] = (pairSupport[pair] || 0) + 1;
                }
            }
        });
        const rules = [];
        // Load category exclusion list based on real DB categories (uppercase)
        const excludeCategories = [
            'STORE',
            'BILLIARD',
            'INVENTORY',
            'AKSESORIS'
        ];
        // PRE-FETCHING optimization: Fetch all items once to avoid N database calls
        const itemCacheList = await Promise.all([
            this.menuItemRepo.find({
                relations: [
                    'category'
                ]
            }),
            this.billiardPackageRepo.find()
        ]);
        const menuCache = new Map(itemCacheList[0].map((i)=>[
                i.id,
                i
            ]));
        const pkgCache = new Map(itemCacheList[1].map((p)=>[
                p.id,
                p
            ]));
        for (const pair of Object.keys(pairSupport)){
            const parts = pair.split(',');
            const support = pairSupport[pair] / totalTransactions;
            // We'll generate rules for A -> B and B -> A if they meet confidence
            const checkAndAddRule = (idA, idB)=>{
                const confidence = pairSupport[pair] / itemSupport[idA];
                if (confidence > 0.15 && support > 0.01) {
                    // Resolve from Cache
                    let nameB = '';
                    let catB = '';
                    let itemFound = false;
                    if (idB.startsWith('menu_')) {
                        const itemB = menuCache.get(Number(idB.split('_')[1]));
                        if (itemB) {
                            nameB = itemB.name;
                            catB = itemB.category?.name || '';
                            itemFound = true;
                        }
                    } else if (idB.startsWith('pkg_')) {
                        const pkgB = pkgCache.get(Number(idB.split('_')[1]));
                        if (pkgB) {
                            nameB = `[BILLIARD] ${pkgB.name}`;
                            catB = 'Billiard';
                            itemFound = true;
                        }
                    }
                    if (!itemFound) return;
                    const catUpper = catB.toUpperCase();
                    const isChalkB = nameB.toUpperCase().includes('CHALK');
                    let nameA = '';
                    let catA = '';
                    if (idA.startsWith('menu_')) {
                        const itemA = menuCache.get(Number(idA.split('_')[1]));
                        nameA = itemA?.name || '';
                        catA = itemA?.category?.name || '';
                    }
                    const isChalkA = nameA.toUpperCase().includes('CHALK');
                    const catAUpper = catA.toUpperCase();
                    const isBExcluded = excludeCategories.includes(catUpper) || isChalkB;
                    const isAExcluded = excludeCategories.includes(catAUpper) || isChalkA;
                    if (!isBExcluded && !isAExcluded) {
                        rules.push({
                            antecedentId: idA,
                            antecedentName: nameA,
                            consequentId: idB,
                            consequentName: nameB,
                            confidence: confidence,
                            support: support
                        });
                    }
                }
            };
            checkAndAddRule(parts[0], parts[1]);
            checkAndAddRule(parts[1], parts[0]);
        }
        this.comboRules = rules.sort((a, b)=>b.confidence - a.confidence);
        this.logger.log(`AI MBA: Discovered ${this.comboRules.length} affinity rules.`);
        return this.comboRules;
    }
    async getComboSuggestion(menuItemId) {
        if (this.comboRules.length === 0) {
            // Just return null if no rules discovered yet to avoid blocking
            return null;
        }
        const match = this.comboRules.find((r)=>r.antecedentId === `menu_${menuItemId}`);
        if (!match) return null;
        const consequent = await this.menuItemRepo.findOne({
            where: {
                id: match.consequentId
            }
        });
        if (!consequent) return null;
        return {
            menuItemId: consequent.id,
            name: consequent.name,
            confidence: match.confidence,
            price: consequent.price
        };
    }
    async getResolvedComboRules() {
        // Already resolved names during discovery for max performance
        return this.comboRules.slice(0, 10).map((rule)=>({
                ...rule,
                consequentName: rule.consequentName,
                antecedentName: rule.antecedentName
            }));
    }
    async getSuggestedBundles() {
        const suggestions = [];
        // 1. Get Overstock Items (Phase 26 logic)
        const menuItems = await this.menuItemRepo.find({
            where: {
                isActive: true
            },
            relations: [
                'productFinance',
                'category'
            ]
        });
        const overstockItems = menuItems.filter((item)=>{
            const stock = Number(item.stockQuantity || 0);
            if (stock <= 20) return false;
            // Simple heuristic: if stock > 20 and it's a food/drink item
            const cat = item.category?.name?.toUpperCase() || '';
            return ![
                'STORE',
                'BILLIARD',
                'INVENTORY',
                'AKSESORIS'
            ].includes(cat);
        }).slice(0, 3);
        overstockItems.forEach((item)=>{
            const hpp = item.productFinance ? Number(item.productFinance.baseHpp) : 0;
            const price = Number(item.price);
            // Suggest a "Buy 2 Get Discount" or similar if overstock
            suggestions.push({
                type: 'OVERSTOCK_CLEARANCE',
                reason: `Stok ${item.name} melimpah (${item.stockQuantity}).`,
                items: [
                    {
                        id: item.id,
                        name: item.name,
                        quantity: 2
                    }
                ],
                suggestedPrice: Math.ceil(price * 1.7 / 1000) * 1000,
                potentialProfit: price * 1.7 - hpp * 2,
                name: `Promo Cuci Gudang ${item.name}`
            });
        });
        // 2. Get MBA Pairings (Phase 51 logic)
        const topRules = this.comboRules.slice(0, 5);
        for (const rule of topRules){
            const idA = parseInt(rule.antecedentId.replace('menu_', ''));
            const idB = parseInt(rule.consequentId.replace('menu_', ''));
            const itemA = menuItems.find((i)=>i.id === idA);
            const itemB = menuItems.find((i)=>i.id === idB);
            if (itemA && itemB) {
                const hppA = itemA.productFinance ? Number(itemA.productFinance.baseHpp) : Number(itemA.price) * 0.4;
                const hppB = itemB.productFinance ? Number(itemB.productFinance.baseHpp) : Number(itemB.price) * 0.4;
                const totalHpp = hppA + hppB;
                // Suggest 30% margin price
                const suggestedPrice = Math.ceil(totalHpp / 0.7 / 1000) * 1000;
                suggestions.push({
                    type: 'TRENDING_PAIR',
                    reason: `${itemA.name} & ${itemB.name} sering dipesan bersamaan (${Math.round(rule.confidence * 100)}% Match).`,
                    items: [
                        {
                            id: itemA.id,
                            name: itemA.name,
                            quantity: 1
                        },
                        {
                            id: itemB.id,
                            name: itemB.name,
                            quantity: 1
                        }
                    ],
                    suggestedPrice,
                    potentialProfit: suggestedPrice - totalHpp,
                    name: `Combo Hemat ${itemA.name} + ${itemB.name}`
                });
            }
        }
        return suggestions.sort((a, b)=>b.potentialProfit - a.potentialProfit).slice(0, 5);
    }
    recordExperience(state, action, reward) {
        this.experienceBuffer.push({
            state,
            action,
            reward
        });
        if (this.experienceBuffer.length > this.MAX_BUFFER_SIZE) {
            this.experienceBuffer.shift();
        }
        // Periodically train
        if (this.experienceBuffer.length % 5 === 0) {
            this.trainDQN();
        }
    }
    async trainDQN() {
        if (this.experienceBuffer.length < 10) return;
        try {
            const batch = this.experienceBuffer.slice(-10);
            const xs = _tfjs.tensor2d(batch.map((b)=>b.state));
            const ys = _tfjs.tensor2d(batch.map((b)=>{
                const y = new Array(5).fill(0);
                y[b.action % 5] = b.reward;
                return y;
            }));
            await this.dqnModel.fit(xs, ys, {
                epochs: 1,
                verbose: 0
            });
            xs.dispose();
            ys.dispose();
        } catch (err) {
            this.logger.error(`DQN Training failed: ${err.message}`);
        }
    }
    /**
   * Phase 53: Neural Waste Risk Prediction
   * Identifies items at risk of being wasted due to expiry or upcoming closures.
   */ async predictWaste() {
        const [ingredients, closures, holidays] = await Promise.all([
            this.ingredientRepo.find({
                where: {
                    stockQuantity: (0, _typeorm1.MoreThanOrEqual)(0.001)
                }
            }),
            this.closureRepo.find({
                where: {
                    startDate: (0, _typeorm1.MoreThanOrEqual)(new Date().toISOString().split('T')[0])
                }
            }),
            this.holidayRepo.find({
                where: {
                    date: (0, _typeorm1.MoreThanOrEqual)(new Date().toISOString().split('T')[0])
                }
            })
        ]);
        const predictions = [];
        const now = new Date();
        for (const ing of ingredients){
            let riskLevel = 0;
            let reason = '';
            let daysUntilRisk = 999;
            // 1. Check Expiry
            if (ing.expiryDate) {
                const expiry = new Date(ing.expiryDate);
                const diffTime = expiry.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) {
                    riskLevel = diffDays <= 2 ? 0.9 : 0.6;
                    reason = diffDays <= 0 ? 'SUDAH KADALUARSA' : `KADALUARSA DALAM ${diffDays} HARI`;
                    daysUntilRisk = Math.max(0, diffDays);
                }
            }
            // 2. Check upcoming closures (Risk of fresh items)
            if (closures.length > 0 && ing.category?.toUpperCase() === 'BAHAN SEGAR') {
                const nextClosure = new Date(closures[0].startDate);
                const diffTime = nextClosure.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 3) {
                    riskLevel = Math.max(riskLevel, 0.7);
                    reason = `LIBUR OPERASIONAL DALAM ${diffDays} HARI`;
                    daysUntilRisk = Math.min(daysUntilRisk, diffDays);
                }
            }
            if (riskLevel > 0) {
                predictions.push({
                    id: ing.id,
                    name: ing.name,
                    potentialWaste: `${ing.stockQuantity} ${ing.unit}`,
                    valuation: Number(ing.stockQuantity) * Number(ing.costPrice || 0),
                    riskLevel,
                    reason,
                    daysUntilClosure: daysUntilRisk
                });
            }
        }
        return predictions.sort((a, b)=>b.riskLevel - a.riskLevel);
    }
    /**
   * Phase 53: Menu Engineering Matrix (BCG Matrix for Food)
   * Analyzes items by Popularity vs. Profitability
   */ async getMenuMatrix() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [sales, menuItems] = await Promise.all([
            this.orderItemRepo.find({
                where: {
                    createdAt: (0, _typeorm1.MoreThanOrEqual)(thirtyDaysAgo),
                    status: _orderitementity.OrderItemStatus.DONE
                },
                relations: [
                    'menuItem',
                    'menuItem.productFinance'
                ],
                withDeleted: true
            }),
            this.menuItemRepo.find({
                relations: [
                    'productFinance'
                ],
                withDeleted: true
            })
        ]);
        const stats = {};
        // Calculate per-item stats
        sales.forEach((s)=>{
            const id = s.menuItemId;
            if (!stats[id]) {
                const hpp = s.menuItem?.productFinance?.baseHpp || 0;
                stats[id] = {
                    qty: 0,
                    margin: Number(s.priceAtOrder) - Number(hpp),
                    name: s.menuItem?.name || s.customName || `Menu #${id}`
                };
            }
            stats[id].qty += Number(s.quantity);
        });
        const items = Object.values(stats);
        if (items.length === 0) return {
            matrix: [],
            averages: {
                popularity: 0,
                margin: 0
            }
        };
        const avgPopularity = items.reduce((s, x)=>s + x.qty, 0) / items.length;
        const avgMargin = items.reduce((s, x)=>s + x.margin, 0) / items.length;
        const matrix = items.map((item)=>{
            let category = 'DOGS';
            if (item.qty >= avgPopularity && item.margin >= avgMargin) category = 'STARS';
            else if (item.qty >= avgPopularity && item.margin < avgMargin) category = 'PLOWHORSES';
            else if (item.qty < avgPopularity && item.margin >= avgMargin) category = 'PUZZLES';
            return {
                ...item,
                totalProfit: item.qty * item.margin,
                matrixCategory: category
            };
        });
        return {
            matrix: matrix.sort((a, b)=>b.totalProfit - a.totalProfit),
            averages: {
                popularity: avgPopularity,
                margin: avgMargin
            }
        };
    }
    /**
   * Phase 53: Waste Anomaly Detection
   * Flags suspicious spikes in waste reporting
   */ async getWasteAnomalies() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const wasteHistory = await this.wasteRepo.find({
            where: {
                createdAt: (0, _typeorm1.MoreThanOrEqual)(thirtyDaysAgo)
            },
            relations: [
                'ingredient'
            ],
            withDeleted: true
        });
        if (wasteHistory.length === 0) return [];
        // Calculate mean and std dev for waste valuation to detect outliers
        const valuations = wasteHistory.map((w)=>Number(w.valuation));
        const mean = valuations.reduce((s, x)=>s + x, 0) / valuations.length;
        const stdDev = Math.sqrt(valuations.reduce((s, x)=>s + Math.pow(x - mean, 2), 0) / valuations.length);
        return wasteHistory.filter((w)=>Number(w.valuation) > mean + stdDev || Number(w.valuation) > 500000) // Outlier or > 500k
        .map((w)=>({
                id: w.id,
                itemName: w.ingredient?.name || `Bahan #${w.ingredientId || '?'}`,
                date: w.createdAt,
                valuation: Number(w.valuation),
                reason: w.reason,
                severity: Number(w.valuation) > mean + 2 * stdDev ? 'CRITICAL' : 'WARNING'
            })).sort((a, b)=>b.valuation - a.valuation);
    }
    /**
   * Phase 54: Smart Inventory Suggestion Engine
   * Generates a dynamic, actionable insight for the dashboard.
   */ async getInventorySmartSuggestion() {
        const [wasteRisk, matrix, anomalies] = await Promise.all([
            this.predictWaste(),
            this.getMenuMatrix(),
            this.getWasteAnomalies()
        ]);
        // Priority 1: High Waste Risk (Expiring soon)
        if (wasteRisk.length > 0 && wasteRisk[0].riskLevel > 0.8) {
            const item = wasteRisk[0];
            return {
                message: `Bahan "${item.name}" akan kadaluarsa dalam ${item.daysUntilClosure} hari. Segera gunakan untuk menu promo atau stok harian untuk menghindari kerugian estimasi ${new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                }).format(item.valuation)}.`,
                action: 'OPTIMIZE_EXPIRY',
                severity: 'CRITICAL'
            };
        }
        // Priority 2: Menu Engineering (Puzzles - High Margin, Low Sales)
        const puzzles = matrix.matrix.filter((m)=>m.matrixCategory === 'PUZZLES');
        if (puzzles.length > 0) {
            const item = puzzles[0];
            return {
                message: `Menu "${item.name}" memiliki margin tinggi (${new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                }).format(item.margin)}) tapi penjualan rendah. Pertimbangkan untuk menampilkannya di bagian 'Rekomendasi' atau berikan insentif upselling ke staf.`,
                action: 'BOOST_SALES',
                severity: 'STRATEGIC'
            };
        }
        // Priority 3: Anomalies
        if (anomalies.length > 0) {
            const item = anomalies[0];
            return {
                message: `Terdeteksi lonjakan waste pada "${item.itemName}". AI menyarankan pengecekan standar porsi (portion control) atau cara penyimpanan untuk mengurangi kerugian berulang.`,
                action: 'REVIEW_PROCESS',
                severity: 'WARNING'
            };
        }
        // Default: General optimization
        return {
            message: "Performa inventaris Anda sangat stabil. AI merekomendasikan untuk tetap menjaga rotasi stok menggunakan metode FEFO (First Expired, First Out).",
            action: 'NONE',
            severity: 'NORMAL'
        };
    }
    constructor(battlePlanRepo, battlePlanItemRepo, menuItemRepo, billiardPackageRepo, transactionRepo, businessDayRepo, orderItemRepo, userRepo, upsellPromptRepo, tableRepo, shiftRepo, cafeTableRepo, settingRepo, promoRepo, ingredientRepo, wasteRepo, holidayRepo, closureRepo, inventoryService, eventsGateway){
        this.battlePlanRepo = battlePlanRepo;
        this.battlePlanItemRepo = battlePlanItemRepo;
        this.menuItemRepo = menuItemRepo;
        this.billiardPackageRepo = billiardPackageRepo;
        this.transactionRepo = transactionRepo;
        this.businessDayRepo = businessDayRepo;
        this.orderItemRepo = orderItemRepo;
        this.userRepo = userRepo;
        this.upsellPromptRepo = upsellPromptRepo;
        this.tableRepo = tableRepo;
        this.shiftRepo = shiftRepo;
        this.cafeTableRepo = cafeTableRepo;
        this.settingRepo = settingRepo;
        this.promoRepo = promoRepo;
        this.ingredientRepo = ingredientRepo;
        this.wasteRepo = wasteRepo;
        this.holidayRepo = holidayRepo;
        this.closureRepo = closureRepo;
        this.inventoryService = inventoryService;
        this.eventsGateway = eventsGateway;
        this.logger = new _common.Logger(AIService.name);
        this.experienceBuffer = [];
        this.MAX_BUFFER_SIZE = 500;
        this.comboRules = [];
        // Performance Caching
        this.cafeHistoryCache = null;
        this.billiardHistoryCache = null;
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
        // AI Strategic Caches
        this.trafficForecastCache = null;
        this.targetSuggestionCache = null;
        this.AI_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for deep re-train
        this.AI_PRE_WARM_MS = 15 * 60 * 1000; // 15 minutes for background refresh
        this.isTraining = false;
        this.AI_STORAGE_DIR = _path.join(process.cwd(), 'storage', 'ai');
        this.MODEL_PATH = `file://${_path.join(process.cwd(), 'storage', 'ai', 'dqn_model').replace(/\\/g, '/')}`;
        this.BUFFER_FILE = _path.join(process.cwd(), 'storage', 'ai', 'experience_buffer.json');
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_HOUR),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIService.prototype, "scheduledAISave", null);
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_DAY_AT_4AM),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIService.prototype, "pruneHistoricalLogs", null);
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_30_MINUTES),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIService.prototype, "checkProactiveOpportunities", null);
_ts_decorate([
    (0, _schedule.Cron)('0 7 * * *'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIService.prototype, "generateDailyStrategyBrief", null);
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_DAY_AT_3AM),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], AIService.prototype, "discoverComboRules", null);
AIService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_battleplanentity.BattlePlan)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_battleplanitementity.BattlePlanItem)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_menuitementity.MenuItem)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_billiardpackageentity.BilliardPackage)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_transactionentity.Transaction)),
    _ts_param(5, (0, _typeorm.InjectRepository)(_businessdayentity.BusinessDay)),
    _ts_param(6, (0, _typeorm.InjectRepository)(_orderitementity.OrderItem)),
    _ts_param(7, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_param(8, (0, _typeorm.InjectRepository)(_upsellpromptentity.UpsellPrompt)),
    _ts_param(9, (0, _typeorm.InjectRepository)(_tableentity.Table)),
    _ts_param(10, (0, _typeorm.InjectRepository)(_shiftentity.Shift)),
    _ts_param(11, (0, _typeorm.InjectRepository)(_cafetableentity.CafeTable)),
    _ts_param(12, (0, _typeorm.InjectRepository)(_settingentity.Setting)),
    _ts_param(13, (0, _typeorm.InjectRepository)(_promoentity.Promo)),
    _ts_param(14, (0, _typeorm.InjectRepository)(_ingrediententity.Ingredient)),
    _ts_param(15, (0, _typeorm.InjectRepository)(_wasteentity.Waste)),
    _ts_param(16, (0, _typeorm.InjectRepository)(_holidayentity.PublicHoliday)),
    _ts_param(17, (0, _typeorm.InjectRepository)(_holidayentity.BusinessClosure)),
    _ts_param(18, (0, _common.Inject)((0, _common.forwardRef)(()=>{
        const { InventoryService: InventoryService1 } = require('../inventory/inventory.service');
        return InventoryService1;
    }))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof InventoryService === "undefined" ? Object : InventoryService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], AIService);

//# sourceMappingURL=ai.service.js.map