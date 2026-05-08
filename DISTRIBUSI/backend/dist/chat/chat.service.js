"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatService", {
    enumerable: true,
    get: function() {
        return ChatService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _chatentity = require("./entities/chat.entity");
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
let ChatService = class ChatService {
    async sendMessage(senderId, receiverId, message, type = 'USER') {
        try {
            // Phase 45 Fix: Handle AI/System sender (ID 0)
            // Use null in DB to avoid Foreign Key constraint issues.
            const dbSenderId = senderId === 0 ? null : senderId;
            const dbReceiverId = receiverId === 0 ? null : receiverId;
            const newMessage = this.chatRepository.create({
                senderId: dbSenderId,
                receiverId: dbReceiverId,
                message,
                type,
                readByUserId: [
                    senderId
                ]
            });
            const messageId = (await this.chatRepository.save(newMessage)).id;
            // Reload with relations for the gateway broadcast
            return await this.chatRepository.findOne({
                where: {
                    id: messageId
                },
                relations: [
                    'sender',
                    'sender.role'
                ]
            });
        } catch (err) {
            console.error('CRITICAL: Failed to save chat message:', err);
            throw err;
        }
    }
    async sendSystemMessage(receiverId, message, type = 'SYSTEM') {
        return this.sendMessage(0, receiverId, message, type);
    }
    async getConversation(userA, userB, limit = 50) {
        return this.chatRepository.find({
            where: [
                {
                    senderId: userA,
                    receiverId: userB
                },
                {
                    senderId: userB,
                    receiverId: userA
                },
                ...userA === 0 || userB === 0 ? [] : [
                    {
                        senderId: (0, _typeorm1.IsNull)(),
                        receiverId: userA
                    },
                    {
                        senderId: (0, _typeorm1.IsNull)(),
                        receiverId: userB
                    }
                ]
            ],
            order: {
                timestamp: 'ASC'
            },
            take: limit,
            relations: [
                'sender',
                'receiver'
            ]
        });
    }
    async markAsRead(userId, senderId) {
        const query = this.chatRepository.createQueryBuilder('chat').andWhere('chat.senderId != :userId', {
            userId
        }); // Never mark own messages
        if (senderId === 0) {
            // Mark only Global Group messages as read (sender is unknown, but receiver is NULL)
            query.andWhere('chat.receiverId IS NULL');
        } else if (senderId === null || senderId === -1) {
            // Handle System/AI messages (senderId in DB is NULL)
            query.andWhere('chat.receiverId = :userId', {
                userId
            }).andWhere('chat.senderId IS NULL');
        } else if (senderId !== undefined) {
            // Mark only specific private messages as read
            query.andWhere('chat.receiverId = :userId', {
                userId
            }).andWhere('chat.senderId = :senderId', {
                senderId
            });
        } else {
            // Mark ALL (Private + Group) as read for this user
            query.andWhere('(chat.receiverId = :userId OR chat.receiverId IS NULL)', {
                userId
            });
        }
        const unreadMessages = await query.getMany();
        for (const msg of unreadMessages){
            const readList = msg.readByUserId || [];
            if (!readList.includes(userId)) {
                readList.push(userId);
                msg.readByUserId = readList;
                msg.isRead = true; // Backward compatibility
                await this.chatRepository.save(msg);
            }
        }
    }
    async getUnreadCount(userId) {
        const messages = await this.chatRepository.createQueryBuilder('chat').where('(chat.receiverId = :userId OR chat.receiverId IS NULL)', {
            userId
        }).andWhere('chat.senderId != :userId', {
            userId
        }).getMany();
        return messages.filter((m)=>!(m.readByUserId || []).includes(userId)).length;
    }
    async getManagementHistory(userId, limit = 50) {
        // Group Chat logic: Fetch all messages where receiverId is NULL (Global)
        // Plus messages specifically to/from this user.
        return this.chatRepository.find({
            where: [
                {
                    receiverId: (0, _typeorm1.IsNull)()
                },
                {
                    receiverId: userId
                },
                {
                    senderId: userId
                }
            ],
            order: {
                timestamp: 'ASC'
            },
            take: limit,
            relations: [
                'sender',
                'sender.role',
                'receiver'
            ]
        });
    }
    constructor(chatRepository){
        this.chatRepository = chatRepository;
    }
};
ChatService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_chatentity.ChatMessage)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], ChatService);

//# sourceMappingURL=chat.service.js.map