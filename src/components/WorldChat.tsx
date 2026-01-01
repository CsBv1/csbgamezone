import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Smile, MessageCircle, X } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  username: string | null;
  message: string;
  is_emote: boolean;
  created_at: string;
}

const EMOTES = [
  { emoji: "👋", label: "Wave" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "💎", label: "Diamond" },
  { emoji: "🐂", label: "Bull" },
  { emoji: "🏆", label: "Trophy" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🎮", label: "Game" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🎉", label: "Party" },
];

interface WorldChatProps {
  userId: string;
  username: string | null;
  playerPosition?: { x: number; y: number };
  onEmoteSent?: (emote: string, x: number, y: number) => void;
}

export function WorldChat({ userId, username, playerPosition, onEmoteSent }: WorldChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showEmotes, setShowEmotes] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);

  // Fetch initial messages and subscribe to realtime
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('world-chat-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'world_chat' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev.slice(-49), newMsg]);
          if (!isOpen && newMsg.user_id !== userId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset unread when opening chat
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('world_chat')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (data) {
      setMessages(data as ChatMessage[]);
    }
  };

  const sendMessage = async (text: string, isEmote = false) => {
    if (!text.trim() || !userId) return;

    await supabase.from('world_chat').insert({
      user_id: userId,
      username: username,
      message: text.trim(),
      is_emote: isEmote,
    });

    // If it's an emote and we have position, broadcast to player_emotes for bubble display
    if (isEmote && playerPosition && onEmoteSent) {
      onEmoteSent(text.trim(), playerPosition.x, playerPosition.y);
      
      // Also insert into player_emotes table for other players to see
      await supabase.from('player_emotes').insert({
        user_id: userId,
        username: username,
        emote: text.trim(),
        x: playerPosition.x,
        y: playerPosition.y,
      });
    }

    setInputText("");
    setShowEmotes(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleEmote = (emoji: string) => {
    sendMessage(emoji, true);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-black shadow-lg shadow-[#00D4FF]/30"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 h-96 flex flex-col bg-[#0d2137] border-[#00D4FF]/30 shadow-xl shadow-[#00D4FF]/20">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#00D4FF]/20">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-[#00D4FF]" />
          <span className="font-bold text-white">World Chat</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-[#00D4FF]/10"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-white/40 text-sm mt-8">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.user_id === userId ? "items-end" : "items-start"}`}
            >
              {msg.is_emote ? (
                <div className="text-4xl animate-bounce">{msg.message}</div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.user_id === userId
                      ? "bg-[#00D4FF] text-black"
                      : "bg-[#1a3a4a] text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${msg.user_id === userId ? "text-black/70" : "text-[#00D4FF]"}`}>
                      {msg.username || "Player"}
                    </span>
                    <span className={`text-xs ${msg.user_id === userId ? "text-black/50" : "text-white/40"}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emote Picker */}
      {showEmotes && (
        <div className="p-2 border-t border-[#00D4FF]/20 bg-[#0a1628]">
          <div className="grid grid-cols-6 gap-1">
            {EMOTES.map((emote) => (
              <Button
                key={emote.emoji}
                variant="ghost"
                size="sm"
                className="h-10 w-10 text-xl hover:bg-[#00D4FF]/20"
                onClick={() => handleEmote(emote.emoji)}
                title={emote.label}
              >
                {emote.emoji}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-[#00D4FF]/20 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`h-10 w-10 shrink-0 ${showEmotes ? "text-[#00D4FF] bg-[#00D4FF]/10" : "text-white/60 hover:text-white"}`}
          onClick={() => setShowEmotes(!showEmotes)}
        >
          <Smile className="w-5 h-5" />
        </Button>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-[#1a3a4a] border-[#00D4FF]/30 text-white placeholder:text-white/40"
          maxLength={200}
        />
        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 shrink-0 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-black"
          disabled={!inputText.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
