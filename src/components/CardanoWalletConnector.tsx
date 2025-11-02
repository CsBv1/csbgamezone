import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { Wallet, LogOut, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CardanoWalletConnectorProps {
  onConnect?: (walletInfo: { walletName: string; address: string; nickname: string }) => void;
  variant?: 'default' | 'gold';
  size?: 'default' | 'lg' | 'sm';
  className?: string;
}

const SUPPORTED_WALLETS = [
  { id: 'nami', name: 'Nami', aliases: ['nami'] },
  { id: 'eternl', name: 'Eternl', aliases: ['eternl', 'ccvault'] },
  { id: 'lace', name: 'Lace', aliases: ['lace'] },
  { id: 'flint', name: 'Flint', aliases: ['flint'] },
  { id: 'typhon', name: 'Typhon', aliases: ['typhon', 'typhoncip30'] },
  { id: 'gerowallet', name: 'Gero', aliases: ['gerowallet'] },
  { id: 'nufi', name: 'NuFi', aliases: ['nufi'] },
  { id: 'begin', name: 'Begin', aliases: ['begin'] },
  { id: 'vespr', name: 'Vespr', aliases: ['vespr'] },
  { id: 'yoroi', name: 'Yoroi', aliases: ['yoroi'] },
];

export const CardanoWalletConnector = ({ 
  onConnect, 
  variant = 'default',
  size = 'default',
  className = '' 
}: CardanoWalletConnectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const { toast } = useToast();
  
  const {
    connectedWallet,
    isConnecting,
    availableWallets,
    connectWallet,
    disconnectWallet,
    shortenAddress,
    isConnected,
  } = useCardanoWallet();

  const handleWalletSelect = async (walletId: string) => {
    // Find the actual wallet key from available wallets using aliases
    const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId);
    const actualWalletKey = availableWallets.find(installed => 
      wallet?.aliases.some(alias => 
        installed.toLowerCase().includes(alias.toLowerCase()) || alias.toLowerCase().includes(installed.toLowerCase())
      )
    );
    setSelectedWallet(actualWalletKey || walletId);
  };

  const handleConnect = async () => {
    if (!selectedWallet || !nickname.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a nickname",
        variant: "destructive",
      });
      return;
    }

    try {
      const walletInfo = await connectWallet(selectedWallet, nickname);
      
      // Register wallet in database and get user_id
      const { data: userId, error: rpcError } = await (supabase as any).rpc('handle_wallet_auth' as any, {
        _wallet_address: walletInfo.address,
        _wallet_name: walletInfo.walletName,
        _nickname: walletInfo.nickname,
      });

      if (rpcError) {
        console.error('Database error:', rpcError);
        toast({
          title: "Connection Failed",
          description: "Could not sync wallet. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Sign in with the wallet credentials to create a proper session
      const email = `${walletInfo.address}@cardano.wallet`;
      const password = `wallet_auth_${walletInfo.address}`;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        toast({
          title: "Connection Failed",
          description: "Authentication failed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Wallet Connected! 🎉",
        description: `Welcome, ${nickname}!`,
      });

      onConnect?.(walletInfo);
      setIsOpen(false);
      setSelectedWallet(null);
      setNickname('');
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    await supabase.auth.signOut();
    disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "You've been signed out",
    });
  };

  const detectedWallets = SUPPORTED_WALLETS.filter(w => 
    availableWallets.some(installed => {
      const installedLower = installed.toLowerCase();
      return w.aliases.some(alias => 
        installedLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(installedLower)
      );
    })
  );

  if (isConnected && connectedWallet) {
    return (
      <div className="flex items-center gap-3">
        <Card className="px-4 py-2 bg-gradient-to-r from-primary/20 to-primary/10 border-primary/40">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">{connectedWallet.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {shortenAddress(connectedWallet.address)}
              </p>
            </div>
          </div>
        </Card>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="border-destructive/40 hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Wallet className="w-5 h-5 mr-2" />
        Connect Wallet
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-gold bg-clip-text text-transparent">
              Connect Cardano Wallet
            </DialogTitle>
            <DialogDescription>
              {!selectedWallet 
                ? "Select your wallet to get started"
                : "Enter your player nickname"}
            </DialogDescription>
          </DialogHeader>

          {!selectedWallet ? (
            <div className="mt-4">
              {detectedWallets.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    No Cardano wallets detected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please install a supported wallet extension:
                  </p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {SUPPORTED_WALLETS.map(w => w.name).join(', ')}
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {detectedWallets.map((wallet) => (
                    <Button
                      key={wallet.id}
                      variant="outline"
                      className="h-14 border-2 hover:border-primary hover:bg-primary/5 text-sm font-semibold"
                      onClick={() => handleWalletSelect(wallet.id)}
                    >
                      {wallet.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">
                  {SUPPORTED_WALLETS.find(w => w.id === selectedWallet)?.name}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">Player Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Enter your nickname..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedWallet(null);
                    setNickname('');
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="gold"
                  onClick={handleConnect}
                  disabled={isConnecting || !nickname.trim()}
                  className="flex-1"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
