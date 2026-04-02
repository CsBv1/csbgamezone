import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Mail, Save, Loader2, Wallet } from 'lucide-react';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';

export const ProfileSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { availableWallets, connectWallet, isConnecting, shortenAddress } = useCardanoWallet();

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, wallet_address')
        .eq('id', user.id)
        .single();
      if (profile?.email) {
        setCurrentEmail(profile.email);
        setEmail(profile.email);
      }
      setWalletAddress(profile?.wallet_address || null);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not logged in'); return; }
      const { error } = await supabase.from('profiles').update({ email }).eq('id', user.id);
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Email already linked to another account' : 'Failed to save email');
        return;
      }
      setCurrentEmail(email);
      toast.success("Email saved! You'll receive Stripe updates here.");
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving email:', error);
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectWallet = async (walletKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not logged in'); return; }

      const walletInfo = await connectWallet(walletKey, user.user_metadata?.username || 'Player');
      
      // Link wallet to profile
      await supabase.from('profiles').update({
        wallet_address: walletInfo.address,
        wallet_name: walletInfo.walletName,
      }).eq('id', user.id);

      setWalletAddress(walletInfo.address);
      toast.success(`Wallet linked! ${shortenAddress(walletInfo.address)}`);
    } catch (error) {
      console.error('Wallet connect error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  // Detect which wallets are installed
  const detectedWallets = availableWallets.slice(0, 6);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Profile Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Email Section */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Email for Billing & Updates</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Link your email for subscription receipts and updates.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input id="profile-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSaving} />
                </div>
                {currentEmail && <p className="text-xs text-muted-foreground">Current: {currentEmail}</p>}
                <Button onClick={handleSave} disabled={isSaving || email === currentEmail} className="w-full">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Email
                </Button>
              </div>
            </Card>

            {/* Wallet Connect Section */}
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h4 className="font-semibold">Connect Cardano Wallet</h4>
              </div>
              {walletAddress ? (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-foreground">✅ Wallet Linked</p>
                  <p className="text-xs text-muted-foreground">{shortenAddress(walletAddress)}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    Link a Cardano wallet to get NFT bonuses & holder rewards.
                  </p>
                  {detectedWallets.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {detectedWallets.map((w) => (
                        <Button key={w} variant="outline" size="sm" onClick={() => handleConnectWallet(w)} disabled={isConnecting} className="text-xs">
                          {w.charAt(0).toUpperCase() + w.slice(1)}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No wallets detected. Install VESPR, Eternl, or Nami.</p>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
