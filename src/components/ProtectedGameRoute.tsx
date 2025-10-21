import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardanoWallet } from '@/hooks/useCardanoWallet';
import { useToast } from '@/hooks/use-toast';

interface ProtectedGameRouteProps {
  children: React.ReactNode;
}

export const ProtectedGameRoute = ({ children }: ProtectedGameRouteProps) => {
  const { isConnected, isReady } = useCardanoWallet();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isReady && !isConnected) {
      toast({
        title: "Wallet Required 🔒",
        description: "Please connect your Cardano wallet to access games",
        variant: "destructive",
      });
      navigate('/dashboard', { replace: true });
    }
  }, [isReady, isConnected, navigate, toast]);

  if (!isReady) {
    return null;
  }

  if (!isConnected) {
    return null;
  }

  return <>{children}</>;
};
