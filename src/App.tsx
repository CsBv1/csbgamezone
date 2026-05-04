import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedGameRoute } from "@/components/ProtectedGameRoute";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Earning games
import BullMining from "./pages/games/BullMining";
import MilkTheBull from "./pages/games/MilkTheBull";
import BullKingdom from "./pages/games/BullKingdom";
import DiamondMines from "./pages/games/DiamondMines";

// Key-only games
import BullGauntlet from "./pages/games/BullGauntlet";
import DiamondFortress from "./pages/games/DiamondFortress";
import TreasureVault from "./pages/games/TreasureVault";
import CosmicGauntlet from "./pages/games/CosmicGauntlet";
import FortuneTrial from "./pages/games/FortuneTrial";
import ShadowVault from "./pages/games/ShadowVault";
import EternalArena from "./pages/games/EternalArena";
import LuckyChain from "./pages/games/LuckyChain";
import PatternMaster from "./pages/games/PatternMaster";
import PerfectTiming from "./pages/games/PerfectTiming";
import RhythmRush from "./pages/games/RhythmRush";
import GemChain from "./pages/games/GemChain";
import RiskVault from "./pages/games/RiskVault";
import SpeedRun from "./pages/games/SpeedRun";
import WheelOfFortune from "./pages/games/WheelOfFortune";

// Multiplayer / Bull World
import BullWorld from "./pages/games/BullWorld";
import MultiplayerCrash from "./pages/games/MultiplayerCrash";
import BullStampede from "./pages/games/BullStampede";
import HoldersArena from "./pages/games/HoldersArena";
import BullSprint from "./pages/games/BullSprint";
import BullRelay from "./pages/games/BullRelay";
import ObstacleRush from "./pages/games/ObstacleRush";

// Protected advanced games
import BullBlitz from "./pages/games/BullBlitz";
import TargetShoot from "./pages/games/TargetShoot";
import RaceDay from "./pages/games/RaceDay";
import PrizePath from "./pages/games/PrizePath";
import BonanzaSpin from "./pages/games/BonanzaSpin";
import BullArena from "./pages/games/BullArena";
import BullCity from "./pages/games/BullCity";

// CSB Game Zone ($CsBv1)
import CsbDashboard from "./pages/csb/CsbDashboard";
import CsbMissions from "./pages/csb/CsbMissions";
import CsbUpgrades from "./pages/csb/CsbUpgrades";
import CsbNftPower from "./pages/csb/CsbNftPower";
import CsbBattleArena from "./pages/csb/CsbBattleArena";
import CsbBullRace from "./pages/csb/CsbBullRace";

// Holder-only strategy games
import BullTactician from "./pages/games/holders/BullTactician";
import KingdomSiege from "./pages/games/holders/KingdomSiege";
import MarketMaster from "./pages/games/holders/MarketMaster";
import BullCommander from "./pages/games/holders/BullCommander";
import FortressBuilder from "./pages/games/holders/FortressBuilder";
import CardanoConquest from "./pages/games/holders/CardanoConquest";
import BullDiplomacy from "./pages/games/holders/BullDiplomacy";
import StrategicStacks from "./pages/games/holders/StrategicStacks";
import BullBlacksmith from "./pages/games/holders/BullBlacksmith";
import BullTrader from "./pages/games/holders/BullTrader";
import ChainDefender from "./pages/games/holders/ChainDefender";
import ADAConquest from "./pages/games/holders/ADAConquest";
import BullTycoon from "./pages/games/holders/BullTycoon";
import StakeWars from "./pages/games/holders/StakeWars";

// New holder strategy games
import BullAlchemist from "./pages/games/holders/BullAlchemist";
import CryptoMerchant from "./pages/games/holders/CryptoMerchant";
import BullWarlord from "./pages/games/holders/BullWarlord";
import StakeArchitect from "./pages/games/holders/StakeArchitect";
import BullSaboteur from "./pages/games/holders/BullSaboteur";
import CardanoRaider from "./pages/games/holders/CardanoRaider";
import BullNexus from "./pages/games/holders/BullNexus";
import ADAOracle from "./pages/games/holders/ADAOracle";
import BullCipher from "./pages/games/holders/BullCipher";
import RuneForge from "./pages/games/holders/RuneForge";
import CouncilStrategy from "./pages/games/holders/CouncilStrategy";
import ChainCitadel from "./pages/games/holders/ChainCitadel";
import ZodiacTrials from "./pages/games/holders/ZodiacTrials";
import BullEspionage from "./pages/games/holders/BullEspionage";
import ADAArchitect from "./pages/games/holders/ADAArchitect";
import BullLegion from "./pages/games/holders/BullLegion";
import CryptoHeist from "./pages/games/holders/CryptoHeist";
import BullSenate from "./pages/games/holders/BullSenate";
import StakeRoyale from "./pages/games/holders/StakeRoyale";
import BullOdyssey from "./pages/games/holders/BullOdyssey";
import BullAuction from "./pages/games/holders/BullAuction";
import BullArcanist from "./pages/games/holders/BullArcanist";
import BullBountyHunt from "./pages/games/holders/BullBountyHunt";
import ADAAlchemy from "./pages/games/holders/ADAAlchemy";
import BullGladiator from "./pages/games/holders/BullGladiator";
import BullChronicle from "./pages/games/holders/BullChronicle";
import StakeDynasty from "./pages/games/holders/StakeDynasty";
import RuneConclave from "./pages/games/holders/RuneConclave";
import BullSovereign from "./pages/games/holders/BullSovereign";
import ADAEmpire from "./pages/games/holders/ADAEmpire";
import BullInquisitor from "./pages/games/holders/BullInquisitor";
import BullVanguard from "./pages/games/holders/BullVanguard";
import ADAVault from "./pages/games/holders/ADAVault";
import BullCartel from "./pages/games/holders/BullCartel";
import StakeOracle from "./pages/games/holders/StakeOracle";
import BullMystic from "./pages/games/holders/BullMystic";
import ChainAlchemist from "./pages/games/holders/ChainAlchemist";
import BullProphet from "./pages/games/holders/BullProphet";
import CryptoSiege from "./pages/games/holders/CryptoSiege";
import BullExplorer from "./pages/games/holders/BullExplorer";
import ADAWarden from "./pages/games/holders/ADAWarden";

// New batch 5 holder games
import BullConqueror from "./pages/games/holders/BullWarlord2";
import StakeFoundry from "./pages/games/holders/StakeArchitect2";
import ADABrewer from "./pages/games/holders/ADAAlchemy2";
import BullFortress from "./pages/games/holders/ChainDefender2";
import CryptoTrader from "./pages/games/holders/MarketMaster2";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Earning games */}
          <Route path="/games/bull-mining" element={<ProtectedGameRoute><BullMining /></ProtectedGameRoute>} />
          <Route path="/games/milk-the-bull" element={<ProtectedGameRoute><MilkTheBull /></ProtectedGameRoute>} />
          <Route path="/games/bull-kingdom" element={<ProtectedGameRoute><BullKingdom /></ProtectedGameRoute>} />
          <Route path="/games/diamond-mines" element={<ProtectedGameRoute><DiamondMines /></ProtectedGameRoute>} />
          
          {/* Key-only games */}
          <Route path="/games/bull-gauntlet" element={<ProtectedGameRoute><BullGauntlet /></ProtectedGameRoute>} />
          <Route path="/games/diamond-fortress" element={<ProtectedGameRoute><DiamondFortress /></ProtectedGameRoute>} />
          <Route path="/games/treasure-vault" element={<ProtectedGameRoute><TreasureVault /></ProtectedGameRoute>} />
          <Route path="/games/cosmic-gauntlet" element={<ProtectedGameRoute><CosmicGauntlet /></ProtectedGameRoute>} />
          <Route path="/games/fortune-trial" element={<ProtectedGameRoute><FortuneTrial /></ProtectedGameRoute>} />
          <Route path="/games/shadow-vault" element={<ProtectedGameRoute><ShadowVault /></ProtectedGameRoute>} />
          <Route path="/games/eternal-arena" element={<ProtectedGameRoute><EternalArena /></ProtectedGameRoute>} />
          <Route path="/games/lucky-chain" element={<ProtectedGameRoute><LuckyChain /></ProtectedGameRoute>} />
          <Route path="/games/pattern-master" element={<ProtectedGameRoute><PatternMaster /></ProtectedGameRoute>} />
          <Route path="/games/perfect-timing" element={<ProtectedGameRoute><PerfectTiming /></ProtectedGameRoute>} />
          <Route path="/games/rhythm-rush" element={<ProtectedGameRoute><RhythmRush /></ProtectedGameRoute>} />
          <Route path="/games/gem-chain" element={<ProtectedGameRoute><GemChain /></ProtectedGameRoute>} />
          <Route path="/games/risk-vault" element={<ProtectedGameRoute><RiskVault /></ProtectedGameRoute>} />
          <Route path="/games/speed-run" element={<ProtectedGameRoute><SpeedRun /></ProtectedGameRoute>} />
          <Route path="/games/wheel-of-fortune" element={<ProtectedGameRoute><WheelOfFortune /></ProtectedGameRoute>} />
          
          {/* Bull World & Multiplayer */}
          <Route path="/games/bull-world" element={<ProtectedGameRoute><BullWorld /></ProtectedGameRoute>} />
          <Route path="/games/multiplayer-crash" element={<MultiplayerCrash />} />
          <Route path="/games/bull-stampede" element={<BullStampede />} />
          <Route path="/games/bull-sprint" element={<BullSprint />} />
          <Route path="/games/bull-relay" element={<BullRelay />} />
          <Route path="/games/obstacle-rush" element={<ObstacleRush />} />
          <Route path="/games/holders-arena" element={<HoldersArena />} />
          
          {/* Protected advanced games */}
          <Route path="/games/bull-blitz" element={<ProtectedGameRoute><BullBlitz /></ProtectedGameRoute>} />
          <Route path="/games/target-shoot" element={<ProtectedGameRoute><TargetShoot /></ProtectedGameRoute>} />
          <Route path="/games/race-day" element={<ProtectedGameRoute><RaceDay /></ProtectedGameRoute>} />
          <Route path="/games/prize-path" element={<ProtectedGameRoute><PrizePath /></ProtectedGameRoute>} />
          <Route path="/games/bonanza-spin" element={<ProtectedGameRoute><BonanzaSpin /></ProtectedGameRoute>} />
          <Route path="/games/bull-arena" element={<ProtectedGameRoute><BullArena /></ProtectedGameRoute>} />
          <Route path="/games/bull-city" element={<BullCity />} />

          {/* CSB Game Zone ($CsBv1 token system) */}
          <Route path="/csb" element={<CsbDashboard />} />
          <Route path="/csb/missions" element={<CsbMissions />} />
          <Route path="/csb/upgrades" element={<CsbUpgrades />} />
          <Route path="/csb/nft-power" element={<CsbNftPower />} />
          <Route path="/csb/battle-arena" element={<CsbBattleArena />} />
          <Route path="/csb/bull-race" element={<CsbBullRace />} />
          
          {/* Holder-only strategy games */}
          <Route path="/games/bull-tactician" element={<BullTactician />} />
          <Route path="/games/kingdom-siege" element={<KingdomSiege />} />
          <Route path="/games/market-master" element={<MarketMaster />} />
          <Route path="/games/bull-commander" element={<BullCommander />} />
          <Route path="/games/fortress-builder" element={<FortressBuilder />} />
          <Route path="/games/cardano-conquest" element={<CardanoConquest />} />
          <Route path="/games/bull-diplomacy" element={<BullDiplomacy />} />
          <Route path="/games/strategic-stacks" element={<StrategicStacks />} />
          <Route path="/games/bull-blacksmith" element={<BullBlacksmith />} />
          <Route path="/games/bull-trader" element={<BullTrader />} />
          <Route path="/games/chain-defender" element={<ChainDefender />} />
          <Route path="/games/ada-conquest" element={<ADAConquest />} />
          <Route path="/games/bull-tycoon" element={<BullTycoon />} />
          <Route path="/games/stake-wars" element={<StakeWars />} />
          
          {/* New holder strategy games */}
          <Route path="/games/bull-alchemist" element={<BullAlchemist />} />
          <Route path="/games/crypto-merchant" element={<CryptoMerchant />} />
          <Route path="/games/bull-warlord" element={<BullWarlord />} />
          <Route path="/games/stake-architect" element={<StakeArchitect />} />
          <Route path="/games/bull-saboteur" element={<BullSaboteur />} />
          <Route path="/games/cardano-raider" element={<CardanoRaider />} />
          <Route path="/games/bull-nexus" element={<BullNexus />} />
          <Route path="/games/ada-oracle" element={<ADAOracle />} />
          <Route path="/games/bull-cipher" element={<BullCipher />} />
          <Route path="/games/rune-forge" element={<RuneForge />} />
          <Route path="/games/council-strategy" element={<CouncilStrategy />} />
          <Route path="/games/chain-citadel" element={<ChainCitadel />} />
          <Route path="/games/zodiac-trials" element={<ZodiacTrials />} />
          <Route path="/games/bull-espionage" element={<BullEspionage />} />
          <Route path="/games/ada-architect" element={<ADAArchitect />} />
          <Route path="/games/bull-legion" element={<BullLegion />} />
          <Route path="/games/crypto-heist" element={<CryptoHeist />} />
          <Route path="/games/bull-senate" element={<BullSenate />} />
          <Route path="/games/stake-royale" element={<StakeRoyale />} />
          <Route path="/games/bull-odyssey" element={<BullOdyssey />} />
          <Route path="/games/bull-auction" element={<BullAuction />} />
          <Route path="/games/bull-arcanist" element={<BullArcanist />} />
          <Route path="/games/bull-bounty-hunt" element={<BullBountyHunt />} />
          <Route path="/games/ada-alchemy" element={<ADAAlchemy />} />
          <Route path="/games/bull-gladiator" element={<BullGladiator />} />
          <Route path="/games/bull-chronicle" element={<BullChronicle />} />
          <Route path="/games/stake-dynasty" element={<StakeDynasty />} />
          <Route path="/games/rune-conclave" element={<RuneConclave />} />
          <Route path="/games/bull-sovereign" element={<BullSovereign />} />
          <Route path="/games/ada-empire" element={<ADAEmpire />} />
          <Route path="/games/bull-inquisitor" element={<BullInquisitor />} />
          <Route path="/games/bull-vanguard" element={<BullVanguard />} />
          <Route path="/games/ada-vault" element={<ADAVault />} />
          <Route path="/games/bull-cartel" element={<BullCartel />} />
          <Route path="/games/stake-oracle" element={<StakeOracle />} />
          <Route path="/games/bull-mystic" element={<BullMystic />} />
          <Route path="/games/chain-alchemist" element={<ChainAlchemist />} />
          <Route path="/games/bull-prophet" element={<BullProphet />} />
          <Route path="/games/crypto-siege" element={<CryptoSiege />} />
          <Route path="/games/bull-explorer" element={<BullExplorer />} />
          <Route path="/games/ada-warden" element={<ADAWarden />} />
          <Route path="/games/bull-conqueror" element={<BullConqueror />} />
          <Route path="/games/stake-foundry" element={<StakeFoundry />} />
          <Route path="/games/ada-brewer" element={<ADABrewer />} />
          <Route path="/games/bull-fortress" element={<BullFortress />} />
          <Route path="/games/crypto-trader" element={<CryptoTrader />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
