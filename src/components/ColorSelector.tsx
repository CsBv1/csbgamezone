import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Key, Check } from "lucide-react";

interface UserColor {
  id: string;
  color_name: string;
  color_value: string;
  active: boolean;
}

export const ColorSelector = () => {
  const [colors, setColors] = useState<UserColor[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserColors();
  }, []);

  const fetchUserColors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_colors' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setColors((data as any) || []);
    } catch (error) {
      console.error('Error fetching colors:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateColor = async (colorId: string) => {
    if (!userId) return;

    try {
      // Deactivate all colors first
      await supabase
        .from('user_colors' as any)
        .update({ active: false })
        .eq('user_id', userId);

      // Activate selected color
      const { error } = await supabase
        .from('user_colors' as any)
        .update({ active: true })
        .eq('id', colorId)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success("Color activated! 🎨");
      fetchUserColors();
    } catch (error) {
      console.error('Error activating color:', error);
      toast.error("Failed to activate color");
    }
  };

  const deactivateColor = async () => {
    if (!userId) return;

    try {
      await supabase
        .from('user_colors' as any)
        .update({ active: false })
        .eq('user_id', userId);

      toast.success("Color deactivated");
      fetchUserColors();
    } catch (error) {
      console.error('Error deactivating color:', error);
      toast.error("Failed to deactivate color");
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">My Colors</h3>
        </div>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </Card>
    );
  }

  if (colors.length === 0) {
    return (
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">My Colors</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          No colors unlocked yet. Spin the Wheel of Fortune to get colors! 🎨
        </p>
      </Card>
    );
  }

  const activeColor = colors.find(c => c.active);

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-2 border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">My Colors ({colors.length})</h3>
      </div>
      
      {activeColor && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border-2" style={{ borderColor: activeColor.color_value }}>
          <p className="text-sm text-muted-foreground mb-2">Currently Active:</p>
          <p 
            className="font-bold text-lg"
            style={{ 
              color: activeColor.color_value,
              textShadow: `0 0 10px ${activeColor.color_value}80`
            }}
          >
            {activeColor.color_name}
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={deactivateColor}
            className="w-full mt-2"
          >
            Deactivate Color
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {colors.map((color) => (
          <div
            key={color.id}
            className="p-3 rounded-lg border-2 hover:scale-[1.02] transition-all cursor-pointer"
            style={{ 
              borderColor: color.active ? color.color_value : 'transparent',
              backgroundColor: `${color.color_value}15`
            }}
            onClick={() => !color.active && activateColor(color.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" style={{ color: color.color_value }} />
                <span 
                  className="font-semibold"
                  style={{ 
                    color: color.color_value,
                    textShadow: `0 0 8px ${color.color_value}60`
                  }}
                >
                  {color.color_name}
                </span>
              </div>
              {color.active && (
                <Check className="w-5 h-5 text-green-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
