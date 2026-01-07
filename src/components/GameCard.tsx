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
}: GameCardProps) {
  const baseClass = "group overflow-hidden bg-card border-4 hover:scale-105 transition-all duration-300 cursor-pointer shadow-xl relative";
  
  const borderClass = buttonVariant === "key" 
    ? isHolder 
      ? "border-amber-400 animate-pulse-glow" 
      : "border-yellow-500 hover:border-yellow-400"
    : isHolder 
      ? "border-amber-400 animate-pulse-glow" 
      : "border-primary hover:border-accent";

  return (
    <Card className={`${baseClass} ${borderClass}`} onClick={onClick}>
      {isHolder && (
        <div className="absolute top-2 left-2 bg-amber-500/90 text-black px-2 py-0.5 rounded-full text-xs font-bold z-10 animate-pulse">
          🐂 HOLDER BOOST
        </div>
      )}
      <div className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
        {badge && (
          <div className={`absolute top-2 right-2 ${badgeColor} px-3 py-1 rounded-full text-xs font-bold`}>
            {badge}
          </div>
        )}
        <Icon className="w-20 h-20 text-white group-hover:scale-110 transition-transform" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className={`w-full ${
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