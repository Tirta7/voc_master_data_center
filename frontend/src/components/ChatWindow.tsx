'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  timestamp: string;
  isRead: boolean;
  type?: 'USER' | 'SYSTEM' | 'AI_COACH';
  sender?: { 
    name: string;
    role?: { name: string };
  };
  senderName?: string;
  senderRole?: string;
}

interface ChatWindowProps {
  receiverId: number;
  receiverName: string;
  onClose: () => void;
  socket: any;
}

export default function ChatWindow({ receiverId, receiverName, onClose, socket }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isWaiter = user?.role?.toUpperCase() === 'WAITER' || user?.role?.toUpperCase() === 'PELAYAN';

  useEffect(() => {
    fetchHistory();
    markAsRead();

    const handleReceiveMessage = (msg: Message) => {
      // Phase 45 Fix: Global group messages might have receiverId 0 or null (from DB)
      const isGlobal = msg.receiverId === 0 || msg.receiverId === null;
      
      const isRelevant = isGlobal || (isWaiter 
        ? (msg.receiverId === user?.id || msg.senderId === user?.id)
        : ((msg.senderId === receiverId && msg.receiverId === user?.id) ||
           (msg.senderId === user?.id && msg.receiverId === receiverId) ||
           (msg.senderId === 0 && msg.receiverId === user?.id)));

      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId !== user?.id) markAsRead(isGlobal ? 0 : msg.senderId);
      }
    };

    socket.on('receive_chat', handleReceiveMessage);
    return () => {
      socket.off('receive_chat', handleReceiveMessage);
    };
  }, [receiverId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      // If receiverId is 0, use consolidated history for the group
      const endpoint = (isWaiter || receiverId === 0) ? 'management-history' : `history/${receiverId}`;
      const res = await axios.get(`${API_URL}/chat/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch chat history', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (senderIdToMark?: number | string) => {
    try {
      const sid = senderIdToMark || (isWaiter ? 'all' : receiverId);
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/chat/read/${sid}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    socket.emit('send_chat', {
      receiverId,
      message: newMessage,
    }, (savedMsg: Message) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === savedMsg.id)) return prev;
        return [...prev, savedMsg];
      });
    });

    setNewMessage('');
  };

  const handleAISuggest = async () => {
    setIsSuggesting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/chat/suggestion/${receiverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewMessage(res.data.suggestion);
    } catch (err) {
      console.error('Failed to fetch AI suggestion', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const isAdmin = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'OWNER' || user?.role?.toUpperCase() === 'CASHIER';

  return (
    <div className="fixed bottom-24 right-6 w-80 h-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[100] overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-indigo-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider truncate max-w-[120px]">
            {receiverName}
          </span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0a0c]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent animate-spin rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-[10px] text-center text-slate-500 italic py-10 uppercase tracking-widest">
            Kirim pesan pertama...
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] px-3 py-2 rounded-xl text-xs font-medium relative ${
                  msg.senderId === user?.id
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : msg.type === 'AI_COACH'
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/50 text-amber-100 rounded-tl-none shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.type === 'AI_COACH' && (
                  <div className="text-[8px] font-black uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    AI Intelligence Coach
                  </div>
                )}
                {/* Group Chat: Show sender name if not current user */}
                {(receiverId === 0 || msg.receiverId === 0 || msg.receiverId === null) && msg.senderId !== user?.id && msg.type !== 'AI_COACH' && (
                  <div className="text-[9px] font-black text-cyan-400 uppercase tracking-tight mb-1 border-b border-cyan-400/10 pb-0.5">
                    {msg.sender?.name || msg.senderName || 'Staff'} 
                    <span className="ml-1 text-[8px] text-cyan-400/60 font-medium">
                      ({msg.sender?.role?.name || msg.senderRole || 'User'})
                    </span>
                  </div>
                )}
                <div className="break-words">{msg.message}</div>
                <p className="text-[8px] opacity-40 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Replies for AI Coaching */}
      {!loading && messages.length > 0 && messages[messages.length - 1].type === 'AI_COACH' && messages[messages.length - 1].senderId !== user?.id && (
        <div className="px-3 pb-2 pt-1 flex flex-wrap gap-2 overflow-x-auto no-scrollbar">
          {['Siap!', 'On it!', 'Siap laksanakan!', 'Lagi proses'].map((reply) => (
            <button
              key={reply}
              onClick={() => {
                setNewMessage(reply);
                handleSendMessage();
              }}
              className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        {isAdmin && (
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={isSuggesting}
            className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-colors group"
            title="AI Suggest"
          >
            <div className={`w-4 h-4 flex items-center justify-center ${isSuggesting ? 'animate-spin' : ''}`}>
              <span className="text-[10px] font-black group-hover:scale-110 transition-transform">🤖</span>
            </div>
          </button>
        )}
        <button
          type="submit"
          className="p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
