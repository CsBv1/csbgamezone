import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, X, Sparkles, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CSBGameMasterProps {
  bullsOwned?: number;
  rarityBonus?: number;
  context?: string;
  embedded?: boolean;
}

const QUICK_PROMPTS = [
  "How do I play the maze?",
  "What are diamonds for?",
  "Tell me about Bull World",
  "Best strategy for Crash?",
];

export function CSBGameMaster({ bullsOwned = 0, rarityBonus = 0, context = "Dashboard", embedded = false }: CSBGameMasterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg = bullsOwned > 0 
        ? `Welcome back, Bull holder! 🐂 You own ${bullsOwned} CSB Bulls with a ${rarityBonus}% bonus. How can I help you dominate today?`
        : "Hey there! I'm the CSB Game Master 🎮 Ask me anything about the games, strategies, or how to earn more diamonds!";
      setMessages([{ role: "assistant", content: welcomeMsg }]);
    }
  }, [isOpen, bullsOwned, rarityBonus]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("game-master", {
        body: { 
          message: text,
          context,
          bullsOwned,
          rarityBonus,
        },
      });

      if (error) throw error;

      const reply = data?.reply || "I'm here to help! Try asking about game mechanics or strategies.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Game Master error:", err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Oops! I'm having a quick power-up moment. Try again! ⚡" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Embedded closed state - clickable box
  if (embedded && !isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="cursor-pointer group"
      >
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="p-3 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
            <Bot className="w-8 h-8 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
              Click to Chat with Game Master
            </p>
            <p className="text-sm text-muted-foreground">Get tips, strategies & bonus info!</p>
          </div>
          <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>
      </div>
    );
  }

  // Floating button (non-embedded mode)
  if (!embedded && !isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 h-14 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 flex items-center gap-2"
      >
        <Bot className="w-6 h-6" />
        <span className="font-bold">Game Master</span>
        <Sparkles className="w-4 h-4 animate-pulse" />
      </Button>
    );
  }

  // Chat interface - different styling for embedded vs floating
  const containerClass = embedded 
    ? "w-full h-[400px] flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border border-amber-500/30 rounded-lg"
    : "fixed bottom-4 left-4 z-50 w-96 h-[500px] flex flex-col bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border-amber-500/30 shadow-xl shadow-amber-500/20";

  return (
    <Card className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">CSB Game Master</h3>
            <p className="text-xs text-amber-400">Your gaming guide</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-amber-500/10"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Bulls Status */}
      {bullsOwned > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-transparent border-b border-amber-500/10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl">🐂</span>
            <span className="text-amber-400 font-semibold">
              {bullsOwned} Bulls • +{rarityBonus}% Bonus Active
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-amber-500 text-black"
                  : "bg-[#2a2a4a] text-white border border-amber-500/20"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400 font-medium">Game Master</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2a2a4a] rounded-2xl px-4 py-3 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-amber-500/20 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 bg-[#2a2a4a] border-amber-500/30 text-white placeholder:text-white/40 focus:border-amber-500"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          disabled={!input.trim() || isLoading}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
}
