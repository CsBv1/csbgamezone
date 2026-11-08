import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
  buttonText: string;
  buttonVariant?: "key" | "default";
  isHolder?: boolean;
  compact?: boolean;
}

export function GameCard({
  title,
  description,
  icon: Icon,
  gradient,
  onClick,
  badge,
  badgeColor = "bg-accent text-accent-foreground",
  buttonText,
  buttonVariant = "default",
  isHolder = false,
  compact = false,
}: GameCardProps) {
  const baseClass = compact
    ? "group overflow-hidden bg-card border-2 hover:scale-[1.03] transition-all duration-300 cursor-pointer shadow-lg relative"
    : "group overflow-hidden bg-card border-4 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl relative";
  
  const borderClass = buttonVariant === "key" 
    ? isHolder 
      ? "border-amber-400 animate-pulse-glow" 
      : "border-yellow-500 hover:border-yellow-400"
    : isHolder 
      ? "border-amber-400 animate-pulse-glow" 
      : "border-primary hover:border-accent";

  return (
    <Card className={`${baseClass} ${borderClass}`} onClick={onClick}>
      {isHolder && !compact && (
        <div className="absolute top-2 left-2 bg-amber-500/90 text-black px-2 py-0.5 rounded-full text-xs font-bold z-10 animate-pulse">
          🐂 HOLDER BOOST
        </div>
      )}
      <div className={`${compact ? "h-20" : "h-40"} bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-3 py-1 text-xs"} rounded-full font-bold`}>
            {badge}
          </div>
        )}
        <Icon className={`${compact ? "w-10 h-10" : "w-20 h-20"} text-white group-hover:scale-110 transition-transform`} />
      </div>
      <div className={compact ? "p-3" : "p-6"}>
        <h3 className={`${compact ? "text-sm mb-1" : "text-xl mb-2"} font-bold text-foreground`}>{title}</h3>
        <p className={`${compact ? "text-xs mb-2 line-clamp-2" : "text-sm mb-4"} text-muted-foreground`}>{description}</p>
        <Button
          variant="outline"
          size="sm"
          className={`w-full ${compact ? "h-7 text-xs" : ""} ${
            buttonVariant === "key"
              ? "border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black"
              : ""
          }`}
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}