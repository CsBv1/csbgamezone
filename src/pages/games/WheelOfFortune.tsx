import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import holyBull from "@/assets/holy-bull.jpeg";
import { audioManager } from "@/hooks/useAudioManager";

// Start music when entering game
audioManager.startBackgroundMusic();

const WheelOfFortune = () => {
  const navigate = useNavigate();
  const [keys, setKeys] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userColors, setUserColors] = useState<any[]>([]);

  const colorPrizes = [
    { name: "Neon Pink", value: "#FF10F0", emoji: "💖" },
    { name: "Electric Blue", value: "#00D4FF", emoji: "⚡" },
    { name: "Laser Green", value: "#39FF14", emoji: "💚" },
    { name: "Cyber Purple", value: "#B026FF", emoji: "💜" },
    { name: "Golden Glow", value: "#FFD700", emoji: "✨" },
    { name: "Toxic Green", value: "#00FF41", emoji: "☢️" },
    { name: "Hot Pink", value: "#FF69B4", emoji: "🔥" },
    { name: "Ice Blue", value: "#7DF9FF", emoji: "❄️" },
    { name: "Solar Orange", value: "#FF4500", emoji: "🌞" },
    { name: "Plasma Red", value: "#FF0080", emoji: "⚡" },
    { name: "Mint Fresh", value: "#00FFB3", emoji: "🍃" },
    { name: "Royal Purple", value: "#7851A9", emoji: "👑" },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch user keys
        const { data: keysData } = await supabase
          .from('user_keys' as any)
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (keysData) setKeys((keysData as any).balance);
        
        // Fetch user colors
        const { data: colorsData } = await supabase
          .from('user_colors' as any)
          .select('*')
          .eq('user_id', user.id);
        
        if (colorsData) setUserColors(colorsData);
      }
    };
    
    fetchUserData();
  }, []);

  const spin = async () => {
    if (keys < 1) {
      audioManager.playSFX('error');
      toast.error("You need a key to spin! 🔑");
      return;
    }

    if (!userId) {
      audioManager.playSFX('error');
      toast.error("Please connect your wallet!");
      return;
    }

    audioManager.playSFX('spin');
    setSpinning(true);
    
    // Deduct key
    const { error: keyError } = await supabase
      .from('user_keys' as any)
      .update({ balance: keys - 1 })
      .eq('user_id', userId);
    
    if (keyError) {
      toast.error("Failed to use key!");
      setSpinning(false);
      return;
    }
    
    setKeys(prev => prev - 1);
    
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + (360 * spins) + Math.random() * 360;
    setRotation(finalRotation);

    setTimeout(async () => {
      audioManager.playSFX('wheelStop');
      const segmentAngle = 360 / colorPrizes.length;
      const normalizedRotation = finalRotation % 360;
      const prizeIndex = Math.floor((360 - normalizedRotation) / segmentAngle) % colorPrizes.length;
      const prize = colorPrizes[prizeIndex];
      audioManager.playSFX('jackpot');

      // Check if user already has this color
      const hasColor = userColors.some((c: any) => c.color_name === prize.name);
      
      if (!hasColor) {
        // Award new color
        const { error: colorError } = await supabase
          .from('user_colors' as any)
          .insert({
            user_id: userId,
            color_name: prize.name,
            color_value: prize.value,
            active: false
          });
        
        if (!colorError) {
          setUserColors(prev => [...prev, { color_name: prize.name, color_value: prize.value }]);
          toast.success(`🎉 Unlocked ${prize.emoji} ${prize.name}!`);
        }
      } else {
        toast.success(`${prize.emoji} You won ${prize.name} (already unlocked)`);
      }

      setResult(prize.name);
      setSpinning(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bull-pattern p-4">
      <Button variant="ghost" onClick={() => navigate("/games")} className="mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to Games
      </Button>

      <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold gradient-gold bg-clip-text text-transparent mb-2">Wheel of Fortune 🐂</h1>
          <p className="text-muted-foreground">Spin for exclusive neon name colors!</p>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary mt-4">
            <Key className="w-6 h-6" />
            <span>Keys: {keys} 🔑</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Colors unlocked: {userColors.length}/{colorPrizes.length}</p>
        </div>

        <div className="mb-6 flex justify-center">
          <img src={holyBull} alt="Holy Bull" className="w-32 h-32 object-cover rounded-full border-4 border-primary" />
        </div>

        <div className="relative w-80 h-80 mx-auto mb-6">
          <div 
            className="w-full h-full rounded-full border-8 border-primary transition-transform duration-[4000ms] ease-out"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(
                from 0deg,
                hsl(var(--primary)) 0deg 30deg,
                hsl(var(--secondary)) 30deg 60deg,
                hsl(var(--accent)) 60deg 90deg,
                hsl(var(--primary)) 90deg 120deg,
                hsl(var(--secondary)) 120deg 150deg,
                hsl(var(--accent)) 150deg 180deg,
                hsl(var(--primary)) 180deg 210deg,
                hsl(var(--secondary)) 210deg 240deg,
                hsl(var(--accent)) 240deg 270deg,
                hsl(var(--primary)) 270deg 300deg,
                hsl(var(--secondary)) 300deg 330deg,
                hsl(var(--accent)) 330deg 360deg
              )`
            }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-background rounded-full border-4 border-primary flex items-center justify-center text-2xl font-bold">
              🐂
            </div>
          </div>
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-primary"></div>
          </div>
        </div>

        {result && (
          <div className="text-center mb-6">
            <p className="text-3xl font-bold" style={{ color: colorPrizes.find(c => c.name === result)?.value }}>
              Won: {result}!
            </p>
          </div>
        )}

        <Button onClick={spin} disabled={spinning || keys < 1} size="lg" className="w-full">
          {spinning ? "Spinning..." : keys < 1 ? "Need Key 🔑" : "Spin (1 🔑)"}
        </Button>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-bold mb-3 text-center">Available Colors</h3>
          <div className="grid grid-cols-3 gap-2">
            {colorPrizes.map((color) => (
              <div 
                key={color.name}
                className="p-2 rounded text-center text-xs"
                style={{ 
                  backgroundColor: `${color.value}20`,
                  borderColor: color.value,
                  borderWidth: '2px'
                }}
              >
                <div style={{ color: color.value }} className="font-bold">
                  {color.emoji} {color.name}
                </div>
                {userColors.some(c => c.color_name === color.name) && (
                  <div className="text-xs mt-1">✓ Unlocked</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WheelOfFortune;
