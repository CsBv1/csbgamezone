import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Palette, Check, Loader2 } from 'lucide-react';

interface UserColor {
  id: string;
  color_name: string;
  color_value: string;
  active: boolean;
}

export const ColorSelectorDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [colors, setColors] = useState<UserColor[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUserColors();
    }
  }, [isOpen]);

  const fetchUserColors = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_colors')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setColors(data || []);
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
        .from('user_colors')
        .update({ active: false })
        .eq('user_id', userId);

      // Activate selected color
      const { error } = await supabase
        .from('user_colors')
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
        .from('user_colors')
        .update({ active: false })
        .eq('user_id', userId);

      toast.success("Color deactivated");
      fetchUserColors();
    } catch (error) {
      console.error('Error deactivating color:', error);
      toast.error("Failed to deactivate color");
    }
  };

  const activeColor = colors.find(c => c.active);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          My Colors
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            My Colors ({colors.length})
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : colors.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground text-sm">
              No colors unlocked yet. Spin the Wheel of Fortune to get colors! 🎨
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {activeColor && (
              <Card className="p-3 bg-muted/50 border-2" style={{ borderColor: activeColor.color_value }}>
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
              </Card>
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
                      <Palette className="w-4 h-4" style={{ color: color.color_value }} />
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
