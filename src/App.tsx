import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedGameRoute } from "@/components/ProtectedGameRoute";
import Dashboard from "./pages/Dashboard";
import Games from "./pages/Games";
import Slots from "./pages/games/Slots";
import NumberBet from "./pages/games/NumberBet";
import CardFlip from "./pages/games/CardFlip";
import BullRun from "./pages/games/BullRun";
import DiceRoll from "./pages/games/DiceRoll";
import Blackjack from "./pages/games/Blackjack";
import Roulette from "./pages/games/Roulette";
import Plinko from "./pages/games/Plinko";
import CoinFlip from "./pages/games/CoinFlip";
import HiLo from "./pages/games/HiLo";
import Mines from "./pages/games/Mines";
import Crash from "./pages/games/Crash";
import Keno from "./pages/games/Keno";
import Baccarat from "./pages/games/Baccarat";
import WheelOfFortune from "./pages/games/WheelOfFortune";
import Scratch from "./pages/games/Scratch";
import Limbo from "./pages/games/Limbo";
import VideoPoker from "./pages/games/VideoPoker";
import SicBo from "./pages/games/Sic Bo";
import DragonTiger from "./pages/games/DragonTiger";
import Aviator from "./pages/games/Aviator";
import TexasHoldem from "./pages/games/TexasHoldem";
import ThreeCardPoker from "./pages/games/ThreeCardPoker";
import War from "./pages/games/War";
import CaribbeanStud from "./pages/games/CaribbeanStud";
import PaiGow from "./pages/games/PaiGow";
import RedDog from "./pages/games/RedDog";
import TeenPatti from "./pages/games/TeenPatti";
import AndarBahar from "./pages/games/AndarBahar";
import FanTan from "./pages/games/FanTan";
import ChuckALuck from "./pages/games/ChuckALuck";
import MoneyWheel from "./pages/games/MoneyWheel";
import BonusBowling from "./pages/games/BonusBowling";
import PrizeDrop from "./pages/games/PrizeDrop";
import Tower from "./pages/games/Tower";
import FishPrawnCrab from "./pages/games/FishPrawnCrab";
import LetItRide from "./pages/games/LetItRide";
import BigSix from "./pages/games/BigSix";
import SpaceRace from "./pages/games/SpaceRace";
import GoldenEgg from "./pages/games/GoldenEgg";
import LuckyLadder from "./pages/games/LuckyLadder";
import BallDrop from "./pages/games/BallDrop";
import ColorMatch from "./pages/games/ColorMatch";
import TreasureHunt from "./pages/games/TreasureHunt";
import LuckyNumbers from "./pages/games/LuckyNumbers";
import WildWest from "./pages/games/WildWest";
import PirateBooty from "./pages/games/PirateBooty";
import DiamondDash from "./pages/games/DiamondDash";
import MysticOrbs from "./pages/games/MysticOrbs";
import JungleJump from "./pages/games/JungleJump";
import CosmicCrash from "./pages/games/CosmicCrash";
import MagicMatch from "./pages/games/MagicMatch";
import RocketRush from "./pages/games/RocketRush";
import AlienInvasion from "./pages/games/AlienInvasion";
import CandyCrush from "./pages/games/CandyCrush";
import BullRace from "./pages/games/BullRace";
import HighLow from "./pages/games/HighLow";
import TripleChance from "./pages/games/TripleChance";
import BullsEye from "./pages/games/BullsEye";
import SevenUp from "./pages/games/SevenUp";
import GoldRush from "./pages/games/GoldRush";
import LuckyWheel from "./pages/games/LuckyWheel";
import NumberGuess from "./pages/games/NumberGuess";
import QuickDraw from "./pages/games/QuickDraw";
import BonanzaBalls from "./pages/games/BonanzaBalls";
import InstantWin from "./pages/games/InstantWin";
import HotShot from "./pages/games/HotShot";
import CrazyEights from "./pages/games/CrazyEights";
import MegaMatch from "./pages/games/MegaMatch";
import RapidRoll from "./pages/games/RapidRoll";
import PowerPick from "./pages/games/PowerPick";
import BlitzBet from "./pages/games/BlitzBet";
import SnapJackpot from "./pages/games/SnapJackpot";
import CashCascade from "./pages/games/CashCascade";
import FortuneFlip from "./pages/games/FortuneFlip";
import BingoBlast from "./pages/games/BingoBlast";
import PokerPeaks from "./pages/games/PokerPeaks";
import LuckyLinks from "./pages/games/LuckyLinks";
import FortuneTower from "./pages/games/FortuneTower";
import DiceDuel from "./pages/games/DiceDuel";
import SpinZone from "./pages/games/SpinZone";
import BonusBurst from "./pages/games/BonusBurst";
import ReelRush from "./pages/games/ReelRush";
import WinWave from "./pages/games/WinWave";
import CashClimb from "./pages/games/CashClimb";
import LuckyStrike from "./pages/games/LuckyStrike";
import GemGrab from "./pages/games/GemGrab";
import PayDirt from "./pages/games/PayDirt";
import StackAttack from "./pages/games/StackAttack";
import VaultCracker from "./pages/games/VaultCracker";
import BullBlitz from "./pages/games/BullBlitz";
import TargetShoot from "./pages/games/TargetShoot";
import RaceDay from "./pages/games/RaceDay";
import PrizePath from "./pages/games/PrizePath";
import BonanzaSpin from "./pages/games/BonanzaSpin";
import BullsParadise from "./pages/games/BullsParadise";
import BullsFortune from "./pages/games/BullsFortune";
import MegaBull from "./pages/games/MegaBull";
import BullChallenge from "./pages/games/BullChallenge";
import BullJackpot from "./pages/games/BullJackpot";
import BullArena from "./pages/games/BullArena";
import BullQuest from "./pages/games/BullQuest";
import BullFrenzy from "./pages/games/BullFrenzy";
import BullMystery from "./pages/games/BullMystery";
import BullPower from "./pages/games/BullPower";
import BullRiches from "./pages/games/BullRiches";
import BullLegend from "./pages/games/BullLegend";
import BullStrike from "./pages/games/BullStrike";
import BullVictory from "./pages/games/BullVictory";
import BullBonanza from "./pages/games/BullBonanza";
import BullMania from "./pages/games/BullMania";
import BullRoyale from "./pages/games/BullRoyale";
import BullChampion from "./pages/games/BullChampion";
import BullEmpire from "./pages/games/BullEmpire";
import BullDestiny from "./pages/games/BullDestiny";
import BullMining from "./pages/games/BullMining";
import MilkTheBull from "./pages/games/MilkTheBull";
import BullKingdom from "./pages/games/BullKingdom";
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
import NotFound from "./pages/NotFound";

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
          <Route path="/games" element={<Games />} />
          <Route path="/games/bull-mining" element={<ProtectedGameRoute><BullMining /></ProtectedGameRoute>} />
          <Route path="/games/milk-the-bull" element={<ProtectedGameRoute><MilkTheBull /></ProtectedGameRoute>} />
          <Route path="/games/bull-kingdom" element={<ProtectedGameRoute><BullKingdom /></ProtectedGameRoute>} />
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
          <Route path="/games/slots" element={<Slots />} />
          <Route path="/games/number-bet" element={<NumberBet />} />
          <Route path="/games/card-flip" element={<CardFlip />} />
          <Route path="/games/bull-run" element={<BullRun />} />
          <Route path="/games/dice-roll" element={<DiceRoll />} />
          <Route path="/games/blackjack" element={<Blackjack />} />
          <Route path="/games/roulette" element={<Roulette />} />
          <Route path="/games/plinko" element={<Plinko />} />
          <Route path="/games/coin-flip" element={<CoinFlip />} />
          <Route path="/games/hi-lo" element={<HiLo />} />
          <Route path="/games/mines" element={<Mines />} />
          <Route path="/games/crash" element={<Crash />} />
          <Route path="/games/keno" element={<Keno />} />
          <Route path="/games/baccarat" element={<Baccarat />} />
          <Route path="/games/wheel-of-fortune" element={<WheelOfFortune />} />
          <Route path="/games/scratch" element={<Scratch />} />
          <Route path="/games/limbo" element={<Limbo />} />
          <Route path="/games/video-poker" element={<VideoPoker />} />
          <Route path="/games/sic-bo" element={<SicBo />} />
          <Route path="/games/dragon-tiger" element={<DragonTiger />} />
          <Route path="/games/aviator" element={<Aviator />} />
          <Route path="/games/texas-holdem" element={<TexasHoldem />} />
          <Route path="/games/three-card-poker" element={<ThreeCardPoker />} />
          <Route path="/games/war" element={<War />} />
          <Route path="/games/caribbean-stud" element={<CaribbeanStud />} />
          <Route path="/games/pai-gow" element={<PaiGow />} />
          <Route path="/games/red-dog" element={<RedDog />} />
          <Route path="/games/teen-patti" element={<TeenPatti />} />
          <Route path="/games/andar-bahar" element={<AndarBahar />} />
          <Route path="/games/fan-tan" element={<FanTan />} />
          <Route path="/games/chuck-a-luck" element={<ChuckALuck />} />
          <Route path="/games/money-wheel" element={<MoneyWheel />} />
          <Route path="/games/bonus-bowling" element={<BonusBowling />} />
          <Route path="/games/prize-drop" element={<PrizeDrop />} />
          <Route path="/games/tower" element={<Tower />} />
          <Route path="/games/fish-prawn-crab" element={<FishPrawnCrab />} />
          <Route path="/games/let-it-ride" element={<LetItRide />} />
          <Route path="/games/big-six" element={<BigSix />} />
          <Route path="/games/space-race" element={<SpaceRace />} />
          <Route path="/games/golden-egg" element={<GoldenEgg />} />
          <Route path="/games/lucky-ladder" element={<LuckyLadder />} />
          <Route path="/games/ball-drop" element={<BallDrop />} />
          <Route path="/games/color-match" element={<ColorMatch />} />
          <Route path="/games/treasure-hunt" element={<TreasureHunt />} />
          <Route path="/games/lucky-numbers" element={<LuckyNumbers />} />
          <Route path="/games/wild-west" element={<WildWest />} />
          <Route path="/games/pirate-booty" element={<PirateBooty />} />
          <Route path="/games/diamond-dash" element={<DiamondDash />} />
          <Route path="/games/mystic-orbs" element={<MysticOrbs />} />
          <Route path="/games/jungle-jump" element={<JungleJump />} />
          <Route path="/games/cosmic-crash" element={<CosmicCrash />} />
          <Route path="/games/magic-match" element={<MagicMatch />} />
          <Route path="/games/rocket-rush" element={<RocketRush />} />
          <Route path="/games/alien-invasion" element={<AlienInvasion />} />
          <Route path="/games/candy-crush" element={<CandyCrush />} />
          <Route path="/games/bull-race" element={<BullRace />} />
          <Route path="/games/high-low" element={<HighLow />} />
          <Route path="/games/triple-chance" element={<TripleChance />} />
          <Route path="/games/bulls-eye" element={<BullsEye />} />
          <Route path="/games/seven-up" element={<SevenUp />} />
          <Route path="/games/gold-rush" element={<GoldRush />} />
          <Route path="/games/lucky-wheel" element={<LuckyWheel />} />
          <Route path="/games/number-guess" element={<NumberGuess />} />
          <Route path="/games/quick-draw" element={<QuickDraw />} />
          <Route path="/games/bonanza-balls" element={<BonanzaBalls />} />
          <Route path="/games/instant-win" element={<InstantWin />} />
          <Route path="/games/hot-shot" element={<HotShot />} />
          <Route path="/games/crazy-eights" element={<CrazyEights />} />
          <Route path="/games/mega-match" element={<MegaMatch />} />
          <Route path="/games/rapid-roll" element={<RapidRoll />} />
          <Route path="/games/power-pick" element={<PowerPick />} />
          <Route path="/games/blitz-bet" element={<BlitzBet />} />
          <Route path="/games/snap-jackpot" element={<SnapJackpot />} />
          <Route path="/games/cash-cascade" element={<CashCascade />} />
          <Route path="/games/fortune-flip" element={<FortuneFlip />} />
          <Route path="/games/bulls-paradise" element={<BullsParadise />} />
          <Route path="/games/bulls-fortune" element={<BullsFortune />} />
          <Route path="/games/mega-bull" element={<MegaBull />} />
          <Route path="/games/bull-challenge" element={<BullChallenge />} />
          <Route path="/games/bull-jackpot" element={<BullJackpot />} />
          <Route path="/games/bull-arena" element={<BullArena />} />
          <Route path="/games/bull-quest" element={<BullQuest />} />
          <Route path="/games/bull-frenzy" element={<BullFrenzy />} />
          <Route path="/games/bull-mystery" element={<BullMystery />} />
          <Route path="/games/bull-power" element={<BullPower />} />
          <Route path="/games/bull-riches" element={<BullRiches />} />
          <Route path="/games/bull-legend" element={<BullLegend />} />
          <Route path="/games/bull-strike" element={<BullStrike />} />
          <Route path="/games/bull-victory" element={<BullVictory />} />
          <Route path="/games/bull-bonanza" element={<BullBonanza />} />
          <Route path="/games/bull-mania" element={<BullMania />} />
          <Route path="/games/bull-royale" element={<BullRoyale />} />
          <Route path="/games/bull-champion" element={<BullChampion />} />
          <Route path="/games/bull-empire" element={<BullEmpire />} />
          <Route path="/games/bull-destiny" element={<BullDestiny />} />
          <Route path="/games/bingo-blast" element={<BingoBlast />} />
          <Route path="/games/poker-peaks" element={<PokerPeaks />} />
          <Route path="/games/lucky-links" element={<LuckyLinks />} />
          <Route path="/games/fortune-tower" element={<FortuneTower />} />
          <Route path="/games/dice-duel" element={<DiceDuel />} />
          <Route path="/games/spin-zone" element={<SpinZone />} />
          <Route path="/games/bonus-burst" element={<BonusBurst />} />
          <Route path="/games/reel-rush" element={<ReelRush />} />
          <Route path="/games/win-wave" element={<WinWave />} />
          <Route path="/games/cash-climb" element={<CashClimb />} />
          <Route path="/games/lucky-strike" element={<LuckyStrike />} />
          <Route path="/games/gem-grab" element={<GemGrab />} />
          <Route path="/games/pay-dirt" element={<PayDirt />} />
          <Route path="/games/stack-attack" element={<StackAttack />} />
          <Route path="/games/vault-cracker" element={<VaultCracker />} />
          <Route path="/games/bull-blitz" element={<ProtectedGameRoute><BullBlitz /></ProtectedGameRoute>} />
          <Route path="/games/target-shoot" element={<ProtectedGameRoute><TargetShoot /></ProtectedGameRoute>} />
          <Route path="/games/race-day" element={<ProtectedGameRoute><RaceDay /></ProtectedGameRoute>} />
          <Route path="/games/prize-path" element={<ProtectedGameRoute><PrizePath /></ProtectedGameRoute>} />
          <Route path="/games/bonanza-spin" element={<ProtectedGameRoute><BonanzaSpin /></ProtectedGameRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
