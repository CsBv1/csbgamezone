import { supabase } from '@/integrations/supabase/client';

export type LoginChain = 'cardano' | 'solana' | 'ethereum' | 'bitcoin';

export const CHAIN_LABELS: Record<LoginChain, { label: string; wallet: string; icon: string }> = {
  cardano: { label: 'Cardano', wallet: 'VESPR, Eternl, Lace…', icon: '₳' },
  solana: { label: 'Solana', wallet: 'Phantom', icon: '◎' },
  ethereum: { label: 'Ethereum', wallet: 'MetaMask', icon: 'Ξ' },
  bitcoin: { label: 'Bitcoin', wallet: 'Xverse', icon: '₿' },
};

const toHex = (s: string) => Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, '0')).join('');
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

type Signed = { address: string; signature: string; key?: string; extraAddress?: string; walletName?: string };
type Signer = (getMessage: (address: string) => Promise<string>) => Promise<Signed>;

const cardanoSigner = (walletKey: string): Signer => async (getMessage) => {
  const w = (window as any).cardano?.[walletKey];
  if (!w) throw new Error('Cardano wallet not found');
  const api = await w.enable();
  const address: string = (await api.getChangeAddress()).toLowerCase();
  const message = await getMessage(address);
  const { signature, key } = await api.signData(address, toHex(message));
  return { address, signature, key, walletName: walletKey };
};

const solanaSigner: Signer = async (getMessage) => {
  const p = (window as any).phantom?.solana ?? (window as any).solana;
  if (!p) throw new Error('Install Phantom to use Solana');
  const { publicKey } = await p.connect();
  const address = publicKey.toString();
  const message = await getMessage(address);
  const res = await p.signMessage(new TextEncoder().encode(message), 'utf8');
  const sig: Uint8Array = res.signature ?? res;
  return { address, signature: toB64(sig), walletName: 'Phantom' };
};

const evmSigner = (chainId: string): Signer => async (getMessage) => {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error('Install MetaMask to use Ethereum');
  const [address] = await eth.request({ method: 'eth_requestAccounts' });
  try { await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); } catch { /* signing works on any chain */ }
  const message = await getMessage(address.toLowerCase());
  const signature = await eth.request({ method: 'personal_sign', params: [toHex(message).replace(/^/, '0x'), address] });
  return { address: address.toLowerCase(), signature, walletName: 'MetaMask' };
};

const bitcoinSigner: Signer = async (getMessage) => {
  const { request, AddressPurpose, MessageSigningProtocols } = await import('sats-connect');
  const res: any = await request('wallet_connect', { addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals], message: 'Sign in to CsB Game Zone' } as any);
  if (res.status === 'error') throw new Error(res.error?.message || 'Xverse connection cancelled');
  const addrs = res.result.addresses as { purpose: string; address: string }[];
  const address = addrs.find((a) => a.purpose === AddressPurpose.Payment)?.address;
  const ordinals = addrs.find((a) => a.purpose === AddressPurpose.Ordinals)?.address;
  if (!address) throw new Error('Xverse returned no payment address');
  const message = await getMessage(address);
  const sig: any = await request('signMessage', { address, message, protocol: MessageSigningProtocols.ECDSA } as any);
  if (sig.status === 'error') throw new Error(sig.error?.message || 'Signing cancelled');
  return { address, signature: sig.result.signature, extraAddress: ordinals, walletName: 'Xverse' };
};

function signerFor(chain: LoginChain, cardanoKey?: string): Signer {
  if (chain === 'cardano') return cardanoSigner(cardanoKey!);
  if (chain === 'solana') return solanaSigner;
  if (chain === 'ethereum') return evmSigner('0x1');
  return bitcoinSigner;
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('wallet-login', { body });
  if (error) {
    let msg = 'Wallet sign in failed';
    try { msg = (await (error as any).context.json()).error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  return data;
}

/** Signs a one-time message with the wallet. link=true adds the wallet to the signed-in player. */
export async function walletSignIn(opts: { chain: LoginChain; cardanoKey?: string; nickname?: string; link?: boolean }) {
  let nonce = '';
  const signed = await signerFor(opts.chain, opts.cardanoKey)(async (address) => {
    const r = await call({ action: 'request', chain: opts.chain, address, link: !!opts.link });
    nonce = r.nonce;
    return r.message as string;
  });
  const r = await call({ action: 'confirm', chain: opts.chain, nonce, nickname: opts.nickname, ...signed });
  if (opts.link) return { address: signed.address, walletName: signed.walletName };
  localStorage.setItem('cardano_wallet_session', JSON.stringify({ walletName: signed.walletName, address: signed.address, nickname: opts.nickname || 'Player' }));
  const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: r.password });
  if (error) throw new Error('Could not start your session');
  return { address: signed.address, walletName: signed.walletName };
}
