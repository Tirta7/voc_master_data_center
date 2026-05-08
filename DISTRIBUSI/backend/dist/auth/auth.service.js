"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthService", {
    enumerable: true,
    get: function() {
        return AuthService;
    }
});
const _common = require("@nestjs/common");
const _jwt = require("@nestjs/jwt");
const _userservice = require("../user/user.service");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _bcrypt = /*#__PURE__*/ _interop_require_wildcard(require("bcrypt"));
const _accessrequestentity = require("./entities/access-request.entity");
const _settingsservice = require("../settings/settings.service");
const _eventsgateway = require("../socket/events.gateway");
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
let AuthService = class AuthService {
    async validateUser(username, pass) {
        const user = await this.userService.findByUsername(username);
        if (user && await _bcrypt.compare(pass, user.password)) {
            if (user.isVerified === false) {
                throw new _common.UnauthorizedException('Akun Anda sedang dinonaktifkan (Unverified). Hubungi Admin.');
            }
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async createAccessRequest(user, socketId) {
        // 1. Check if user already has a pending or recently approved request (within 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await this.accessRequestRepository.findOne({
            where: [
                {
                    userId: user.id,
                    status: _accessrequestentity.AccessRequestStatus.PENDING,
                    createdAt: (0, _typeorm1.MoreThan)(fiveMinsAgo)
                }
            ],
            order: {
                createdAt: 'DESC'
            }
        });
        if (existing) {
            // If user refreshed or re-logged, update the socketId so approval reaches the right place
            if (socketId && existing.socketId !== socketId) {
                existing.socketId = socketId;
                await this.accessRequestRepository.save(existing);
            }
            return existing;
        }
        // 2. Validate Shift
        const settings = await this.settingsService.getSettings();
        const baseShift = settings.availableShifts?.find((s)=>s.name === user.baseShift);
        let isOutOfShift = false;
        let shiftTimeRange = '';
        if (baseShift) {
            shiftTimeRange = `${baseShift.startTime} - ${baseShift.endTime}`;
            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            // Basic wrap-around check for shifts like 22:00 - 06:00
            if (baseShift.startTime < baseShift.endTime) {
                isOutOfShift = currentTime < baseShift.startTime || currentTime > baseShift.endTime;
            } else {
                // Night shift
                isOutOfShift = currentTime < baseShift.startTime && currentTime > baseShift.endTime;
            }
        }
        const request = this.accessRequestRepository.create({
            userId: user.id,
            username: user.username,
            employeeName: user.name,
            roleName: user.role?.name?.toUpperCase() || user.role?.toUpperCase() || 'USER',
            isOutOfShift,
            shiftName: user.baseShift || undefined,
            shiftTimeRange: shiftTimeRange || undefined,
            status: _accessrequestentity.AccessRequestStatus.PENDING,
            socketId: socketId || undefined
        });
        const saved = await this.accessRequestRepository.save(request);
        // Notify Admins
        if (this.eventsGateway.server) {
            this.eventsGateway.server.emit('new_access_request', saved);
        }
        return saved;
    }
    async getPendingAccessRequests() {
        return this.accessRequestRepository.find({
            where: {
                status: _accessrequestentity.AccessRequestStatus.PENDING
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async approveAccessRequest(requestId, adminId, adminName, note) {
        const request = await this.accessRequestRepository.findOne({
            where: {
                id: requestId
            }
        });
        if (!request) throw new _common.BadRequestException('Request not found');
        request.status = _accessrequestentity.AccessRequestStatus.APPROVED;
        request.approvedBy = adminId;
        request.approvedByName = adminName;
        request.note = note || undefined;
        const saved = await this.accessRequestRepository.save(request);
        // Generate full token for the user now
        const user = await this.userService.findById(request.userId);
        if (!user) throw new _common.BadRequestException('User not found');
        const tokenData = await this.login(user);
        // Notify Waiter via socket
        // We send both targeted and global to ensure delivery if socketId is slightly stale
        if (this.eventsGateway.server) {
            const payload = {
                requestId: saved.id,
                userId: request.userId,
                ...tokenData
            };
            if (request.socketId) {
                this.eventsGateway.server.to(request.socketId).emit('access_approved', payload);
            }
            // Always emit global as a fallback (client filters by requestId/userId)
            this.eventsGateway.server.emit('access_approved_global', payload);
        }
        // Notify other Admins to remove this request from UI
        if (this.eventsGateway.server) {
            this.eventsGateway.server.emit('access_request_handled', {
                requestId: saved.id
            });
        }
        return saved;
    }
    async denyAccessRequest(requestId, adminId, adminName, note) {
        const request = await this.accessRequestRepository.findOne({
            where: {
                id: requestId
            }
        });
        if (!request) throw new _common.BadRequestException('Request not found');
        request.status = _accessrequestentity.AccessRequestStatus.DENIED;
        request.approvedBy = adminId;
        request.approvedByName = adminName;
        request.note = note || undefined;
        const saved = await this.accessRequestRepository.save(request);
        if (this.eventsGateway.server) {
            const payload = {
                requestId: saved.id,
                userId: request.userId,
                note: note || undefined
            };
            if (request.socketId) {
                this.eventsGateway.server.to(request.socketId).emit('access_denied', payload);
            }
            // Always emit global as a fallback
            this.eventsGateway.server.emit('access_denied_global', payload);
        }
        // Notify other Admins to remove this request from UI
        if (this.eventsGateway.server) {
            this.eventsGateway.server.emit('access_request_handled', {
                requestId: saved.id
            });
        }
        return saved;
    }
    async login(user) {
        const payload = {
            username: user.username,
            sub: user.id
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role?.name || user.role,
                permissions: user.role?.permissions || user.permissions,
                assignedTableIds: user.assignedTableIds
            }
        };
    }
    constructor(userService, jwtService, accessRequestRepository, settingsService, eventsGateway){
        this.userService = userService;
        this.jwtService = jwtService;
        this.accessRequestRepository = accessRequestRepository;
        this.settingsService = settingsService;
        this.eventsGateway = eventsGateway;
    }
};
AuthService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(2, (0, _typeorm.InjectRepository)(_accessrequestentity.AccessRequest)),
    _ts_param(4, (0, _common.Inject)((0, _common.forwardRef)(()=>_eventsgateway.EventsGateway))),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService,
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _settingsservice.SettingsService === "undefined" ? Object : _settingsservice.SettingsService,
        typeof _eventsgateway.EventsGateway === "undefined" ? Object : _eventsgateway.EventsGateway
    ])
], AuthService);

//# sourceMappingURL=auth.service.js.map