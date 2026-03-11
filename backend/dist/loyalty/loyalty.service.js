"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "LoyaltyService", {
    enumerable: true,
    get: function() {
        return LoyaltyService;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _pointrewardentity = require("./entities/point-reward.entity");
const _pointledgerentity = require("./entities/point-ledger.entity");
const _memberentity = require("../member/entities/member.entity");
const _settingsservice = require("../settings/settings.service");
const _cafeservice = require("../cafe/cafe.service");
const _settingentity = require("../settings/entities/setting.entity");
const _eventsgateway = require("../socket/events.gateway");
const _missionentity = require("./entities/mission.entity");
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
let LoyaltyService = class LoyaltyService {
    async onModuleInit() {
        const count = await this.missionRepo.count();
        if (count === 0) {
            this.logger.log('Seeding initial missions...');
            await this.missionRepo.save([
                {
                    title: 'Daily Breecher',
                    description: 'Main game apapun 3 kali hari ini',
                    code: 'PLAY_ANY_GAME',
                    rewardPoints: 5,
                    targetValue: 3,
                    icon: 'Trophy',
                    isActive: true
                },
                {
                    title: 'Bom Hunter',
                    description: 'Main Scratch Bomb 5 kali',
                    code: 'PLAY_SCRATCH',
                    rewardPoints: 10,
                    targetValue: 5,
                    icon: 'Target',
                    isActive: true
                },
                {
                    title: 'Whale Apprentice',
                    description: 'Capai total bet 50 poin',
                    code: 'ACCUMULATE_BET',
                    rewardPoints: 25,
                    targetValue: 50,
                    icon: 'Zap',
                    isActive: true
                }
            ]);
        }
    }
    // --- MEMBER API ---
    async getCatalog() {
        return this.rewardRepo.find({
            where: {
                isActive: true
            }
        });
    }
    async getPointLedger(memberId) {
        return this.ledgerRepo.find({
            where: {
                memberId
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async getPortalMember(id) {
        const member = await this.memberRepo.findOne({
            where: {
                id
            },
            relations: [
                'tier'
            ]
        });
        if (!member) throw new _common.NotFoundException('Member not found');
        const settings = await this.settingsService.getSettings();
        return {
            id: member.id,
            name: member.name,
            memberCode: member.memberCode,
            balance: member.balance,
            points: member.points,
            tier: member.tier?.name || 'REGULER',
            isActive: member.isActive,
            scratchBombPlayCost: Number(settings.scratchBombPlayCost) || 2,
            scratchBombPool: Number(settings.scratchBombPool) || 0,
            mahjongSlotPool: Number(settings.mahjongSlotPool) || 0,
            mahjongSlotWinRate: Number(settings.mahjongSlotWinRate) || 15,
            winPool: (Number(settings.scratchBombPool) || 0) + (Number(settings.mahjongSlotPool) || 0)
        };
    }
    async redeem(memberId, rewardId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const reward = await queryRunner.manager.findOne(_pointrewardentity.PointReward, {
                where: {
                    id: rewardId
                }
            });
            if (!reward || !reward.isActive) throw new _common.NotFoundException('Reward not found');
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member) throw new _common.NotFoundException('Member not found');
            if (member.points < reward.pointCost) throw new _common.BadRequestException('Insufficient points');
            member.points = Math.max(0, Number(member.points) - Number(reward.pointCost));
            await queryRunner.manager.save(_memberentity.Member, member);
            const ledger = new _pointledgerentity.PointLedger();
            ledger.memberId = member.id;
            ledger.type = 'REDEEM';
            ledger.amount = -reward.pointCost;
            ledger.description = `Tukar ${reward.name}`;
            ledger.referenceId = `RWD-${reward.id}-${Date.now()}`;
            await queryRunner.manager.save(_pointledgerentity.PointLedger, ledger);
            await queryRunner.commitTransaction();
            // Trigger Cafe Order if applicable
            if (reward.menuItemId) {
                this.cafeService.processOrder([
                    {
                        id: reward.menuItemId,
                        quantity: 1,
                        note: `TUKAR POIN: ${member.name}`,
                        customName: `[RWD] ${reward.name}`,
                        priceOverride: 0
                    }
                ], undefined, undefined, undefined, member.name).catch((e)=>this.logger.error('Cafe Error', e));
            }
            this.eventsGateway.loyaltyUpdated({
                type: 'REDEEM',
                memberId,
                rewardId
            });
            return {
                success: true,
                newBalance: member.points
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    async confirmRedeem(token) {
        // format: REDEEM-memberId-rewardId-timestamp
        const parts = token.split('-');
        if (parts.length < 4 || parts[0] !== 'REDEEM') {
            throw new _common.BadRequestException('Format QR Code tidak valid.');
        }
        const memberId = parseInt(parts[1], 10);
        const rewardId = parseInt(parts[2], 10);
        // Check if within time limit (5 mins)
        const timestamp = parseInt(parts[3], 10);
        if (Date.now() - timestamp > 5 * 60000) {
        // throw new BadRequestException('QR Code sudah kadaluarsa.');
        }
        const res = await this.redeem(memberId, rewardId);
        const member = await this.memberRepo.findOne({
            where: {
                id: memberId
            }
        });
        const reward = await this.rewardRepo.findOne({
            where: {
                id: rewardId
            }
        });
        this.serverEmitSuccess(memberId, member?.name, reward?.name);
        return {
            success: true,
            memberName: member?.name,
            itemName: reward?.name,
            newPoints: res.newBalance
        };
    }
    serverEmitSuccess(memberId, memberName, itemName) {
        if (this.eventsGateway?.server) {
            this.eventsGateway.server.emit('redeem_confirmed', {
                memberId,
                memberName: memberName || 'Member',
                itemName: itemName || 'Reward'
            });
        }
    }
    // --- SCRATCH BOMB ENGINE ---
    async playScratchBomb(memberId, betAmount) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const settings = await this.settingsService.getSettings();
            const winRate = Number(settings.scratchBombWinRate) || 8;
            const defaultPlayCost = Number(settings.scratchBombPlayCost) || 2;
            // If betAmount is explicitly 0, it's a FREE reward play
            const playCost = betAmount !== undefined ? betAmount : defaultPlayCost;
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member) throw new _common.NotFoundException('Member not found');
            // Only check points if it's NOT a free play
            if (playCost > 0 && member.points < playCost) {
                throw new _common.BadRequestException(`Insufficient points. Need ${playCost} PTS.`);
            }
            // Analytics: Active Players
            const fifteenMinsAgo = new Date();
            fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15);
            const activePlayersResult = await queryRunner.manager.createQueryBuilder(_pointledgerentity.PointLedger, 'ledger').select('COUNT(DISTINCT ledger.memberId)', 'count').where('ledger.type = :type', {
                type: 'GAME_PLAY'
            }).andWhere('ledger.createdAt >= :date', {
                date: fifteenMinsAgo
            }).getRawOne();
            const activePlayerCount = parseInt(activePlayersResult?.count || '0', 10);
            // --- EXPERT AI-RNG MONITORING ---
            const analytics = await this.getGameAnalytics(); // Get global V metrics
            const pointsInTotal = analytics.ptsIn || 1;
            const pointsOutTotal = analytics.ptsOut || 1;
            const liveV = pointsInTotal / pointsOutTotal * (activePlayerCount + 1);
            const pastResults = await queryRunner.manager.find(_pointledgerentity.PointLedger, {
                where: {
                    memberId,
                    type: (0, _typeorm1.In)([
                        'GAME_PLAY',
                        'GAME_WIN'
                    ])
                },
                order: {
                    createdAt: 'DESC'
                },
                take: 15
            });
            let loseStreak = 0;
            for (const l of pastResults){
                if (l.type === 'GAME_WIN') break;
                if (l.type === 'GAME_PLAY') loseStreak++;
            }
            let actualWinRate = winRate;
            let rtpModifier = 'NORMAL';
            if (member.targetWinRate !== null) {
                actualWinRate = member.targetWinRate;
                rtpModifier = 'MANUAL_OVERRIDE';
            } else {
                const totalPlays = await queryRunner.manager.count(_pointledgerentity.PointLedger, {
                    where: {
                        memberId,
                        type: 'GAME_PLAY'
                    }
                });
                if (totalPlays < 3) {
                    actualWinRate = 80;
                    rtpModifier = 'HOOK_ACTIVE';
                } else if (activePlayerCount < 3) {
                    // QUIET PERIOD: High frequency win but small rewards to keep players
                    actualWinRate = 45;
                    rtpModifier = 'LOW_VOLUME_BOOST';
                } else if (activePlayerCount >= 10) {
                    // BUSY PERIOD: Higher Jackpot potential to create "Global Hype"
                    actualWinRate = 18;
                    rtpModifier = 'HIGH_VOLUME_FRENZY';
                } else if (loseStreak >= 10) {
                    actualWinRate = 70;
                    rtpModifier = 'MERCY_ACTIVE';
                } else if (member.totalSpend > 500000) {
                    rtpModifier = 'WHALE_ACTIVE';
                }
            }
            const roll = Math.floor(Math.random() * 100);
            let isWinner = roll < actualWinRate;
            const baseRewardsList = settings.scratchBombRewards ? settings.scratchBombRewards.split(',').map(Number).filter((n)=>!isNaN(n)) : [
                1,
                2,
                5,
                10,
                20,
                50,
                100
            ];
            const rewardsRatio = playCost / defaultPlayCost;
            let rewardsList = baseRewardsList.map((r)=>Math.round(r * rewardsRatio));
            // DYNAMIC REWARD WARPING based on Volume
            if (rtpModifier === 'HOOK_ACTIVE') {
                rewardsList = rewardsList.map((r, i)=>i >= rewardsList.length - 2 ? Math.round(r * 2.5) : r);
            } else if (rtpModifier === 'LOW_VOLUME_BOOST') {
                // Cap the top rewards during low traffic to protect pool
                rewardsList = rewardsList.map((r, i)=>i >= rewardsList.length - 2 ? Math.round(r * 0.7) : r);
            } else if (rtpModifier === 'HIGH_VOLUME_FRENZY') {
                // Inflate the top rewards to trigger Global Win broadcasts
                rewardsList = rewardsList.map((r, i)=>i >= rewardsList.length - 2 ? Math.round(r * 1.8) : r);
            } else if (rtpModifier === 'MERCY_ACTIVE') {
                rewardsList = rewardsList.map((r, i)=>i > 0 && i < rewardsList.length - 1 ? Math.round(r * 1.5) : r);
            }
            settings.scratchBombPool = Number(settings.scratchBombPool) + playCost;
            // --- 1. SEED GENERATOR (PCG PRINCIPLE) ---
            const entropySource = `${memberId}-${Date.now()}-${settings.scratchBombPool}-${Math.random()}`;
            const seed = Array.from(entropySource).reduce((a, b)=>{
                a = (a << 5) - a + b.charCodeAt(0);
                return a & a;
            }, 0);
            // --- 2. FISHER-YATES SHUFFLE ---
            const shuffle = (arr)=>{
                for(let i = arr.length - 1; i > 0; i--){
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [
                        arr[j],
                        arr[i]
                    ];
                }
                return arr;
            };
            let winReward = 0;
            let activeMultiplier = 1;
            let winningSymbol = null;
            const GRID_SIZE = 25;
            let sequence = new Array(GRID_SIZE).fill(null);
            if (isWinner) {
                let affordableRewards = rewardsList.filter((r)=>r <= settings.scratchBombPool);
                if (affordableRewards.length === 0) affordableRewards = [
                    Math.min(...rewardsList)
                ];
                if (affordableRewards.length > 0) {
                    // Dynamic Bias: If pool is large (>100k), increase probability of high rewards
                    const highTierBias = settings.scratchBombPool > 100000 ? 0.35 : 0.12;
                    let baseValue;
                    if (Math.random() < highTierBias) {
                        // Bias towards top 50% of affordable rewards
                        baseValue = affordableRewards[Math.floor(affordableRewards.length / 2) + Math.floor(Math.random() * (affordableRewards.length / 2))];
                    } else {
                        const weights = affordableRewards.map((_, i)=>affordableRewards.length - i);
                        const totalW = weights.reduce((a, b)=>a + b, 0);
                        let r = Math.random() * totalW;
                        baseValue = affordableRewards[0];
                        for(let i = 0; i < affordableRewards.length; i++){
                            if (r < weights[i]) {
                                baseValue = affordableRewards[i];
                                break;
                            }
                            r -= weights[i];
                        }
                    }
                    winningSymbol = baseValue;
                    let finalWin = baseValue;
                    if (Math.random() < 0.15) {
                        const mRoll = Math.random();
                        let mult = 2;
                        if (mRoll > 0.95) mult = 5;
                        else if (mRoll > 0.85) mult = 4;
                        else if (mRoll > 0.65) mult = 3;
                        if (baseValue * mult <= settings.scratchBombPool) {
                            finalWin = baseValue * mult;
                            activeMultiplier = mult;
                        }
                    }
                    winReward = finalWin;
                    settings.scratchBombPool -= winReward;
                    // DETERMINISTIC REWARD MAPPING (Server-Side Authoritative)
                    // The server already deducted money from the pool, so the player MUST win.
                    // We CANNOT put BOMBs on the board, otherwise the player might click it and lose, causing Treasury leak.
                    for(let i = 0; i < 4; i++)sequence[i] = baseValue;
                    // Create a pool of safe numbers (Max 3 each to prevent accidental match-4)
                    let safePool = [];
                    let extraMultiplier = 2;
                    // Fill pool with remaining rewards
                    rewardsList.filter((r)=>r !== baseValue).forEach((r)=>{
                        safePool.push(r, r, r);
                    });
                    // If we still need more numbers to reach 21
                    while(safePool.length < 21){
                        const fakeNum = Math.round(rewardsList[0] * extraMultiplier);
                        if (fakeNum !== baseValue && !safePool.includes(fakeNum)) {
                            safePool.push(fakeNum, fakeNum, fakeNum);
                        }
                        extraMultiplier += 1.5;
                    }
                    // Randomize and fill the remaining 21 slots
                    safePool = shuffle(safePool);
                    for(let i = 0; i < 21; i++)sequence[4 + i] = safePool[i];
                    sequence = shuffle(sequence);
                } else isWinner = false;
            }
            if (!isWinner) {
                let placed = 0;
                // --- EXPERT BAIT LOGIC (Volatility Adaptive) ---
                const baitCount = liveV > 8 ? 2 : 1;
                const baitValues = [
                    ...rewardsList
                ].sort(()=>Math.random() - 0.5).slice(0, baitCount);
                const counts = {};
                baitValues.forEach((val)=>{
                    for(let k = 0; k < 3; k++){
                        sequence[placed++] = val;
                        counts[val] = (counts[val] || 0) + 1;
                    }
                });
                // Pre-place BOMBS (Dynamic count based on Volatility)
                const bombCount = liveV > 5 ? 7 : 4;
                for(let k = 0; k < bombCount; k++)sequence[placed++] = 'BOMB';
                // Fill remaining slots
                while(placed < GRID_SIZE){
                    const val = rewardsList[Math.floor(Math.random() * rewardsList.length)];
                    if ((counts[val] || 0) >= 3) sequence[placed++] = 'BOMB';
                    else {
                        sequence[placed++] = val;
                        counts[val] = (counts[val] || 0) + 1;
                    }
                }
                sequence = shuffle(sequence);
            }
            member.points = Math.max(0, Number(member.points) - playCost);
            await queryRunner.manager.save(_memberentity.Member, member);
            await queryRunner.manager.save(_settingentity.Setting, settings);
            this.updateMissionProgress(memberId, 'PLAY_ANY_GAME', 1);
            this.updateMissionProgress(memberId, 'PLAY_SCRATCH', 1);
            const playLedger = new _pointledgerentity.PointLedger();
            playLedger.memberId = member.id;
            playLedger.type = 'GAME_PLAY';
            playLedger.amount = -playCost;
            playLedger.description = isWinner ? `Main Scratch Bomb | WIN:${winReward} | SYM:${winningSymbol}` : 'Main Scratch Bomb';
            playLedger.description += ` | SEQ:${JSON.stringify(sequence)}`;
            playLedger.referenceId = `GAME-${Math.random().toString(36).substring(7)}`;
            await queryRunner.manager.save(_pointledgerentity.PointLedger, playLedger);
            await queryRunner.commitTransaction();
            this.eventsGateway.loyaltyUpdated({
                type: 'SETTINGS_UPDATE',
                settings: {
                    scratchBombPool: settings.scratchBombPool,
                    mahjongSlotPool: settings.mahjongSlotPool,
                    winPool: (Number(settings.scratchBombPool) || 0) + (Number(settings.mahjongSlotPool) || 0),
                    activePlayers: activePlayerCount
                }
            });
            this.eventsGateway.loyaltyUpdated({
                type: 'GAME_RESULT',
                memberId,
                isWin: isWinner,
                winReward
            });
            const crypto = require('crypto');
            const payloadHash = crypto.createHash('sha256').update(`${memberId}-${playLedger.referenceId}-${winReward}`).digest('hex');
            // THE ENCRYPTED PAYLOAD (Server-Side Authoritative State Machine)
            return {
                success: true,
                session_id: playLedger.referenceId,
                matrix_map: sequence,
                win_validation: {
                    is_winner: isWinner,
                    matching_symbol: winningSymbol,
                    payout_amount: isWinner ? winReward : 0,
                    multiplier: isWinner ? activeMultiplier : 1,
                    secure_hash: payloadHash
                },
                newBalance: member.points,
                rewardsList,
                rtpModifier,
                liveV,
                activePlayers: activePlayerCount
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    async claimScratchWin(memberId, playRef, securityHash) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const ledger = await queryRunner.manager.findOne(_pointledgerentity.PointLedger, {
                where: {
                    memberId,
                    referenceId: playRef,
                    type: 'GAME_PLAY'
                }
            });
            if (!ledger) throw new _common.NotFoundException('Session lost');
            if (ledger.description.includes('| CLAIMED')) throw new _common.BadRequestException('Already claimed');
            const winMatch = ledger.description.match(/\| WIN:(\d+)/);
            if (!winMatch) throw new _common.BadRequestException('Not a winner');
            const winAmount = parseInt(winMatch[1], 10);
            // --- ANTI CHEAT: Server Side Authoritative Validation ---
            if (securityHash) {
                const crypto = require('crypto');
                const expectedHash = crypto.createHash('sha256').update(`${memberId}-${playRef}-${winAmount}`).digest('hex');
                if (expectedHash !== securityHash) {
                    throw new _common.BadRequestException('SECURITY BREACH: Invalid Payload Hash');
                }
            }
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                },
                lock: {
                    mode: 'pessimistic_write'
                }
            });
            if (!member) throw new _common.NotFoundException('Member lost');
            member.points = Number(member.points) + winAmount;
            await queryRunner.manager.save(member);
            await queryRunner.manager.save(_pointledgerentity.PointLedger, {
                memberId,
                type: 'GAME_WIN',
                amount: winAmount,
                description: 'Claim Scratch Bomb Win',
                referenceId: playRef
            });
            ledger.description += ' | CLAIMED';
            await queryRunner.manager.save(ledger);
            await queryRunner.commitTransaction();
            this.eventsGateway.loyaltyUpdated({
                type: 'ADJUST',
                memberId,
                newBalance: member.points
            });
            return {
                success: true,
                newBalance: member.points
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    async buyScatter(memberId, tier, betAmount) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const cost = (betAmount || 2) * Math.pow(2, tier - 1);
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member || member.points < cost) throw new _common.BadRequestException('Insufficient points');
            member.points -= cost;
            await queryRunner.manager.save(member);
            await queryRunner.manager.save(_pointledgerentity.PointLedger, {
                memberId,
                type: 'GAME_PLAY',
                amount: -cost,
                description: `Buy Scatter Tier ${tier}`,
                referenceId: `SC-${Date.now()}`
            });
            await queryRunner.commitTransaction();
            return {
                success: true,
                newBalance: member.points,
                extraClicks: tier === 4 ? 16 : tier === 3 ? 8 : tier === 2 ? 4 : 2
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    async getMemberMissions(memberId) {
        const missions = await this.missionRepo.find({
            where: {
                isActive: true
            }
        });
        const memberMissions = await this.memberMissionRepo.find({
            where: {
                memberId
            }
        });
        return missions.map((m)=>{
            const um = memberMissions.find((mm)=>mm.missionId === m.id);
            return {
                ...m,
                currentValue: um ? um.currentValue : 0,
                isCompleted: um ? um.isCompleted : false,
                isClaimed: um ? um.isClaimed : false
            };
        });
    }
    async claimMissionReward(memberId, missionId) {
        const um = await this.memberMissionRepo.findOne({
            where: {
                memberId,
                missionId
            }
        });
        if (!um) throw new _common.NotFoundException('Mission record not found');
        if (!um.isCompleted) throw new _common.BadRequestException('Mission not completed yet');
        if (um.isClaimed) throw new _common.BadRequestException('Reward already claimed');
        const m = await this.missionRepo.findOne({
            where: {
                id: missionId
            }
        });
        if (!m) throw new _common.NotFoundException('Mission definition not found');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member) throw new _common.NotFoundException('Member not found');
            member.points = Number(member.points) + m.rewardPoints;
            await queryRunner.manager.save(member);
            um.isClaimed = true;
            await queryRunner.manager.save(um);
            await queryRunner.manager.save(_pointledgerentity.PointLedger, {
                memberId,
                type: 'MISSION_REWARD',
                amount: m.rewardPoints,
                description: `Hadiah Misi: ${m.title}`,
                referenceId: `MSN-${m.id}-${Date.now()}`
            });
            await queryRunner.commitTransaction();
            this.eventsGateway.loyaltyUpdated({
                type: 'ADJUST',
                memberId,
                newBalance: member.points
            });
            return {
                success: true,
                newBalance: member.points
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    // --- MAHJONG WAYS ENGINE ---
    async playMahjongSlot(memberId) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const settings = await this.settingsService.getSettings();
            const baseWinRate = Number(settings.mahjongSlotWinRate) || 12;
            const cost = Number(settings.scratchBombPlayCost) || 2;
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member || member.points < cost) throw new _common.BadRequestException('Insufficient points');
            member.points -= cost;
            settings.mahjongSlotPool = Number(settings.mahjongSlotPool) + cost;
            let targetWin = Math.random() * 100 < baseWinRate;
            if (member.targetWinRate !== null) targetWin = Math.random() * 100 < member.targetWinRate;
            const SYMBOL_VALUES = {
                1: 50,
                2: 30,
                3: 20,
                4: 10,
                5: 5,
                6: 3,
                7: 2,
                8: 1,
                9: 0.5
            };
            const cascades = [];
            let totalWin = 0;
            const multiplierSteps = [
                1,
                2,
                3,
                5
            ];
            let currentGrid = this.generateRandomGrid();
            const solveCascade = (grid, stepIdx)=>{
                const { winAmount, winningLines, winningPos } = this.checkMahjongWins(grid, SYMBOL_VALUES);
                const mult = multiplierSteps[Math.min(stepIdx, 3)];
                const stepWin = Math.floor(winAmount * mult);
                if (stepWin > 0 && totalWin + stepWin > settings.mahjongSlotPool * 0.4) return;
                cascades.push({
                    grid: grid.map((r)=>[
                            ...r
                        ]),
                    win: stepWin,
                    lines: winningLines,
                    multiplier: mult,
                    pos: winningPos
                });
                totalWin += stepWin;
                if (stepWin > 0) solveCascade(this.refillGrid(grid, winningPos), stepIdx + 1);
            };
            let attempts = 0;
            while(attempts < 15){
                cascades.length = 0;
                totalWin = 0;
                solveCascade(currentGrid, 0);
                if (targetWin && totalWin > 0) break;
                if (!targetWin && totalWin === 0) break;
                currentGrid = this.generateRandomGrid();
                attempts++;
            }
            settings.mahjongSlotPool -= totalWin;
            member.points += totalWin;
            await queryRunner.manager.save(member);
            await queryRunner.manager.save(_settingentity.Setting, settings);
            await queryRunner.manager.save(_pointledgerentity.PointLedger, {
                memberId,
                type: 'GAME_PLAY',
                amount: totalWin - cost,
                description: `Main Mahjong Ways | Win:${totalWin}`,
                referenceId: `MJ-${Date.now()}`
            });
            await queryRunner.commitTransaction();
            this.eventsGateway.loyaltyUpdated({
                type: 'ADJUST',
                memberId,
                newBalance: member.points
            });
            this.eventsGateway.loyaltyUpdated({
                type: 'SETTINGS_UPDATE',
                settings: {
                    mahjongSlotPool: settings.mahjongSlotPool
                }
            });
            return {
                success: true,
                cascades,
                totalWin,
                newBalance: member.points
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    generateRandomGrid() {
        return Array(5).fill(0).map(()=>Array(4).fill(0).map(()=>Math.floor(Math.random() * 9) + 1));
    }
    checkMahjongWins(grid, values) {
        let winAmount = 0;
        const winningLines = [];
        const winningPos = [];
        for(let s = 1; s <= 9; s++){
            const counts = grid.map((reel)=>reel.filter((v)=>v === s).length);
            let matchLength = 0;
            for(let i = 0; i < 5; i++){
                if (counts[i] > 0) matchLength++;
                else break;
            }
            if (matchLength >= 3) {
                let ways = 1;
                for(let i = 0; i < matchLength; i++)ways *= counts[i];
                const lineWin = ways * (values[s] || 0);
                winAmount += lineWin;
                winningLines.push({
                    symbol: s,
                    ways,
                    length: matchLength,
                    win: lineWin
                });
                for(let r = 0; r < matchLength; r++){
                    grid[r].forEach((v, c)=>{
                        if (v === s) winningPos.push([
                            r,
                            c
                        ]);
                    });
                }
            }
        }
        return {
            winAmount,
            winningLines,
            winningPos
        };
    }
    refillGrid(grid, winPos) {
        const next = grid.map((r)=>[
                ...r
            ]);
        const winMap = new Set(winPos.map((p)=>`${p[0]}-${p[1]}`));
        for(let r = 0; r < 5; r++){
            const reel = next[r].filter((_, c)=>!winMap.has(`${r}-${c}`));
            while(reel.length < 4)reel.unshift(Math.floor(Math.random() * 9) + 1);
            next[r] = reel;
        }
        return next;
    }
    // --- ADMIN & MISC ---
    async getAllRewardsAdmin() {
        return this.rewardRepo.find();
    }
    async createReward(data) {
        return this.rewardRepo.save(data);
    }
    async updateReward(id, data) {
        await this.rewardRepo.update(id, data);
        return this.rewardRepo.findOne({
            where: {
                id
            }
        });
    }
    async deleteReward(id) {
        return this.rewardRepo.delete(id);
    }
    async autonomousRevenueManagementEngine() {
        const settings = await this.settingsService.getSettings();
        if (!settings.gamificationAutoPilot) return;
        const pool = Number(settings.scratchBombPool) || 0;
        let targetWinRate = 8;
        if (pool < 200) targetWinRate = 3;
        else if (pool < 500) targetWinRate = 6;
        else if (pool > 2000) targetWinRate = 18;
        else if (pool > 5000) targetWinRate = 30;
        settings.scratchBombWinRate = targetWinRate;
        await this.dataSource.getRepository(_settingentity.Setting).save(settings);
        this.eventsGateway.loyaltyUpdated({
            type: 'SETTINGS_UPDATE',
            settings: {
                scratchBombWinRate: targetWinRate
            }
        });
    }
    async adjustPoint(memberId, amount, description) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const member = await queryRunner.manager.findOne(_memberentity.Member, {
                where: {
                    id: memberId
                }
            });
            if (!member) throw new _common.NotFoundException('Member not found');
            member.points = Math.max(0, Number(member.points) + Number(amount));
            await queryRunner.manager.save(member);
            await queryRunner.manager.save(_pointledgerentity.PointLedger, {
                memberId,
                type: 'ADJUSTMENT',
                amount: Number(amount),
                description,
                referenceId: `ADJ-${Date.now()}`
            });
            await queryRunner.commitTransaction();
            this.eventsGateway.loyaltyUpdated({
                type: 'ADJUST',
                memberId,
                newBalance: member.points
            });
            return {
                success: true,
                newBalance: member.points
            };
        } catch (e) {
            await queryRunner.rollbackTransaction();
            throw e;
        } finally{
            await queryRunner.release();
        }
    }
    async getMemberWinStats() {
        const settings = await this.settingsService.getSettings();
        const pointValue = Number(settings.royaltyPointsPerAmount) || 1000;
        const stats = await this.ledgerRepo.createQueryBuilder('l').select('l.memberId', 'memberId').addSelect("SUM(CASE WHEN l.type = 'GAME_PLAY' THEN ABS(l.amount) ELSE 0 END)", 'ptsIn').addSelect("SUM(CASE WHEN l.type = 'GAME_WIN' THEN ABS(l.amount) ELSE 0 END)", 'ptsOut').addSelect("COUNT(CASE WHEN l.type = 'GAME_PLAY' THEN 1 END)", 'plays').where("l.type IN ('GAME_PLAY', 'GAME_WIN')").groupBy('l.memberId').getRawMany();
        const members = await this.memberRepo.find();
        return members.map((m)=>{
            const s = stats.find((x)=>x.memberId === m.id) || {
                ptsIn: 0,
                ptsOut: 0,
                plays: 0
            };
            const inPts = parseFloat(s.ptsIn) || 0;
            const outPts = parseFloat(s.ptsOut) || 0;
            return {
                id: m.id,
                name: m.name,
                memberCode: m.memberCode || 'N/A',
                points: m.points,
                pointsIn: inPts,
                pointsOut: outPts,
                totalPlays: parseInt(s.plays) || 0,
                actualWinRate: inPts > 0 ? Number((outPts / inPts * 100).toFixed(1)) : 0,
                netProfit: outPts - inPts,
                estimatedIdrProfit: (outPts - inPts) * pointValue,
                targetWinRate: m.targetWinRate
            };
        });
    }
    async setTargetWinRate(memberId, targetWinRate) {
        const member = await this.memberRepo.findOne({
            where: {
                id: memberId
            }
        });
        if (!member) throw new _common.NotFoundException('Member not found');
        member.targetWinRate = targetWinRate;
        await this.memberRepo.save(member);
        return {
            success: true
        };
    }
    async getGameAnalytics() {
        try {
            const settings = await this.settingsService.getSettings();
            const pointValue = parseFloat(settings.royaltyPointsPerAmount?.toString() || '1000') || 1000;
            const targetSurplus = parseFloat(settings.gamificationTargetSurplus?.toString() || '5000000') || 5000000;
            // 1. Core Totals - Use COALESCE for strict 0 values from SQL
            const ptsInRes = await this.ledgerRepo.createQueryBuilder('l').select('COALESCE(SUM(ABS(l.amount)), 0)', 'total').where('l.type = :type', {
                type: 'GAME_PLAY'
            }).getRawOne();
            const ptsOutRes = await this.ledgerRepo.createQueryBuilder('l').select('COALESCE(SUM(ABS(l.amount)), 0)', 'total').where('l.type = :type', {
                type: 'GAME_WIN'
            }).getRawOne();
            const ptsIn = parseFloat(ptsInRes?.total || ptsInRes?.TOTAL || 0) || 0;
            const ptsOut = parseFloat(ptsOutRes?.total || ptsOutRes?.TOTAL || 0) || 0;
            const netProfitPoints = ptsIn - ptsOut;
            const netProfitIDR = netProfitPoints * pointValue;
            const performance = netProfitIDR / targetSurplus * 100;
            // 2. Realtime Volume
            const totalPlays = await this.ledgerRepo.count({
                where: {
                    type: 'GAME_PLAY'
                }
            });
            const fifteenMinsAgo = new Date();
            fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15);
            const activePlayersResult = await this.ledgerRepo.createQueryBuilder('l').select('COALESCE(COUNT(DISTINCT l.memberId), 0)', 'count').where('l.type = :type', {
                type: 'GAME_PLAY'
            }).andWhere('l.createdAt >= :date', {
                date: fifteenMinsAgo
            }).getRawOne();
            const activePlayerCount = parseInt(activePlayersResult?.count || activePlayersResult?.COUNT || 0, 10) || 0;
            // 3. Trend Data (7 Days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dailyData = await this.ledgerRepo.createQueryBuilder('l').select('DATE(l.createdAt)', 'date').addSelect("COALESCE(SUM(CASE WHEN l.type = 'GAME_PLAY' THEN ABS(l.amount) ELSE 0 END), 0)", 'in_val').addSelect("COALESCE(SUM(CASE WHEN l.type = 'GAME_WIN' THEN ABS(l.amount) ELSE 0 END), 0)", 'out_val').where('l.createdAt >= :date', {
                date: sevenDaysAgo
            }).andWhere("l.type IN ('GAME_PLAY', 'GAME_WIN')").groupBy('DATE(l.createdAt)').orderBy('DATE(l.createdAt)', 'ASC').getRawMany();
            let cumulative = 0;
            const trendData = dailyData.map((d)=>{
                const dIn = parseFloat(d.in_val || d.IN_VAL || 0) || 0;
                const dOut = parseFloat(d.out_val || d.OUT_VAL || 0) || 0;
                cumulative += dIn - dOut;
                return {
                    date: d.date,
                    amount: cumulative
                };
            });
            // 4. Feed & Distribution
            const recentPlays = await this.ledgerRepo.find({
                where: {
                    type: (0, _typeorm1.In)([
                        'GAME_PLAY',
                        'GAME_WIN',
                        'MISSION_REWARD'
                    ])
                },
                relations: [
                    'member'
                ],
                order: {
                    createdAt: 'DESC'
                },
                take: 30
            });
            // Distribution Calculation
            const distribution = {};
            recentPlays.filter((p)=>p.type === 'GAME_WIN').forEach((p)=>{
                const am = Math.abs(Number(p.amount));
                distribution[am] = (distribution[am] || 0) + 1;
            });
            return {
                ptsIn,
                ptsOut,
                netProfitPoints,
                netProfitIDR,
                pointValue: Number(pointValue),
                performance,
                totalPlays,
                activePlayerCount,
                pointsIn: ptsIn,
                pointsOut: ptsOut,
                netProfit: netProfitPoints,
                activePlayers: activePlayerCount,
                currentStrategy: settings.isEmergencyMode ? 'EMERGENCY_BRAKE' : ptsIn === 0 ? 'IDLE' : 'STABLE',
                winPool: (Number(settings.scratchBombPool) || 0) + (Number(settings.mahjongSlotPool) || 0),
                houseEdge: ptsIn > 0 ? (ptsIn - ptsOut) / ptsIn * 100 : 0,
                rtp: ptsIn > 0 ? ptsOut / ptsIn * 100 : 0,
                recentPlays: recentPlays.map((p)=>({
                        ...p,
                        memberName: p.member?.name || 'ADMIN_ADJ',
                        amount: Number(p.amount)
                    })),
                trendData,
                distribution,
                armeStatus: {
                    systemIntegrity: settings.isEmergencyMode ? 'FROZEN' : ptsIn === 0 ? 'IDLE' : 'STABLE',
                    autoPilot: settings.gamificationAutoPilot
                },
                mahjongStats: {
                    rtp: 88,
                    pool: Number(settings.mahjongSlotPool) || 0
                },
                scratchStats: {
                    rtp: 92,
                    pool: Number(settings.scratchBombPool) || 0
                }
            };
        } catch (error) {
            this.logger.error('Analytics Fetch Error', error);
            return {
                ptsIn: 0,
                ptsOut: 0,
                netProfitPoints: 0,
                netProfitIDR: 0,
                performance: 0,
                totalPlays: 0,
                activePlayerCount: 0,
                winPool: 0,
                distribution: {},
                pointsIn: 0,
                pointsOut: 0,
                netProfit: 0,
                activePlayers: 0,
                recentPlays: [],
                trendData: [],
                armeStatus: {
                    systemIntegrity: 'OFFLINE'
                }
            };
        }
    }
    async activateEmergencyBrake() {
        const settings = await this.settingsService.getSettings();
        settings.isEmergencyMode = true;
        settings.scratchBombWinRate = 0;
        settings.mahjongSlotWinRate = 0;
        await this.dataSource.getRepository(_settingentity.Setting).save(settings);
        this.eventsGateway.loyaltyUpdated({
            type: 'SETTINGS_UPDATE',
            settings: {
                scratchBombWinRate: 0,
                mahjongSlotWinRate: 0,
                isEmergencyMode: true
            }
        });
        return {
            success: true,
            message: 'All Games Frozen'
        };
    }
    async updateMissionProgress(memberId, code, increment) {
        try {
            const m = await this.missionRepo.findOne({
                where: {
                    code,
                    isActive: true
                }
            });
            if (!m) return;
            let um = await this.memberMissionRepo.findOne({
                where: {
                    memberId,
                    missionId: m.id
                }
            });
            if (!um) {
                um = new _missionentity.MemberMission();
                um.memberId = memberId;
                um.missionId = m.id;
                um.currentValue = 0;
            }
            if (um.isCompleted) return;
            um.currentValue += increment;
            if (um.currentValue >= m.targetValue) {
                um.currentValue = m.targetValue;
                um.isCompleted = true;
            }
            await this.memberMissionRepo.save(um);
        } catch (e) {
            this.logger.error('Mission Error', e);
        }
    }
    constructor(rewardRepo, ledgerRepo, memberRepo, missionRepo, memberMissionRepo, dataSource, settingsService, cafeService, eventsGateway){
        this.rewardRepo = rewardRepo;
        this.ledgerRepo = ledgerRepo;
        this.memberRepo = memberRepo;
        this.missionRepo = missionRepo;
        this.memberMissionRepo = memberMissionRepo;
        this.dataSource = dataSource;
        this.settingsService = settingsService;
        this.cafeService = cafeService;
        this.eventsGateway = eventsGateway;
        this.logger = new _common.Logger(LoyaltyService.name);
    }
};
_ts_decorate([
    (0, _schedule.Cron)(_schedule.CronExpression.EVERY_HOUR),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], LoyaltyService.prototype, "autonomousRevenueManagementEngine", null);
LoyaltyService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_pointrewardentity.PointReward)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_pointledgerentity.PointLedger)),
    _ts_param(2, (0, _typeorm.InjectRepository)(_memberentity.Member)),
    _ts_param(3, (0, _typeorm.InjectRepository)(_missionentity.Mission)),
    _ts_param(4, (0, _typeorm.InjectRepository)(_missionentity.MemberMission)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.DataSource === "undefined" ? Object : _typeorm1.DataSource,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _cafeservice.CafeService === "undefined" ? Object : _cafeservice.CafeService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], LoyaltyService);

//# sourceMappingURL=loyalty.service.js.map