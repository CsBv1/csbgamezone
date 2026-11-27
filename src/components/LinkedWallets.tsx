import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { walletSignIn, CHAIN_LABELS, type LoginChain } from '@/lib/walletLogin';

type Scan = { wallets: { chain: LoginChain; address: string }[]; results: { chain: string; collection: string; count: number }[]; total: number; collectionsConfigured: number };

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Shows every verified wallet on the player's account and the bulls found on other networks. */
export const LinkedWallets = () => {
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = async () => {
    setBusy('scan');
    const { data } = await supabase.functions.invoke('scan-chain-bulls', { body: {} });
    if (data) setScan(data as Scan);
    setBusy(null);
  };
  useEffect(() => { if (open) refresh(); }, [open]);

  const add = async (chain: LoginChain) => {
    let cardanoKey: string | undefined;
    if (chain === 'cardano') {
      cardanoKey = Object.keys((window as any).cardano ?? {}).find((k) => typeof (window as any).cardano[k]?.enable === 'function');
      if (!cardanoKey) return toast({ title: 'No Cardano wallet found', variant: 'destructive' });
    }
    setBusy(chain);
    try {
      await walletSignIn({ chain, cardanoKey, link: true });
      toast({ title: `${CHAIN_LABELS[chain].label} wallet added 🐂` });
      await refresh();
    } catch (e) {
      toast({ title: 'Could not add wallet', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const countFor = (chain: string) => scan?.results.filter((r) => r.chain === chain).reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="My wallets">
        <Plus className="w-4 h-4 mr-1" /> Wallets
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>My Wallets</DialogTitle>
            <DialogDescription>Add wallets from any network. Your bulls from all of them count together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(scan?.wallets ?? []).map((w) => (
              <div key={w.chain + w.address} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span>{CHAIN_LABELS[w.chain]?.icon} {CHAIN_LABELS[w.chain]?.label} · {short(w.address)}</span>
                {w.chain !== 'cardano' && <span className="text-primary font-semibold">{countFor(w.chain)} 🐂</span>}
              </div>
            ))}
            {scan && scan.wallets.length === 0 && <p className="text-sm text-muted-foreground">No verified wallets yet. Add one below.</p>}
            {scan && scan.collectionsConfigured === 0 && (
              <p className="text-xs text-muted-foreground">Bulls on Solana, Ethereum and Bitcoin will show here once those collections are minted.</p>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(CHAIN_LABELS) as LoginChain[]).map((c) => (
              <Button key={c} size="sm" variant="outline" disabled={!!busy} className="flex-col h-14 px-1 text-xs" onClick={() => add(c)}>
                <span className="text-lg leading-none">{CHAIN_LABELS[c].icon}</span>
                {busy === c ? '…' : CHAIN_LABELS[c].label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={!!busy}>
            <RefreshCw className="w-4 h-4 mr-1" /> Rescan bulls
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
