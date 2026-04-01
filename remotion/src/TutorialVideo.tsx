import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadBody } from "@remotion/google-fonts/Rajdhani";

const { fontFamily: titleFont } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: bodyFont } = loadBody("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const GOLD = "#FFD700";
const DARK_BG = "#0a0a0f";
const ACCENT = "#00D4FF";
const BULL_RED = "#FF4444";

// --- Persistent animated background ---
const AnimatedBG: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hue = interpolate(frame, [0, durationInFrames], [220, 280]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, hsl(${hue}, 60%, 8%) 0%, ${DARK_BG} 70%)` }}>
      {[...Array(20)].map((_, i) => {
        const x = (i * 137.5) % 100;
        const y = (i * 97.3 + frame * 0.1 * (i % 3 + 1)) % 120 - 10;
        const size = 2 + (i % 4);
        const opacity = 0.05 + (i % 5) * 0.03;
        return <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: "50%", background: i % 2 === 0 ? GOLD : ACCENT, opacity }} />;
      })}
    </AbsoluteFill>
  );
};

// --- Scene: Intro ---
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const subtitleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const bullEmoji = spring({ frame: frame - 10, fps, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 120, transform: `scale(${bullEmoji})` }}>🐂</div>
      <h1 style={{ fontFamily: titleFont, fontSize: 80, color: GOLD, transform: `scale(${titleScale})`, textShadow: `0 0 40px ${GOLD}55`, textAlign: "center", lineHeight: 1.1 }}>
        CSB GAME ZONE
      </h1>
      <p style={{ fontFamily: bodyFont, fontSize: 36, color: ACCENT, opacity: subtitleOpacity, marginTop: 20, letterSpacing: 4 }}>
        GAMEPLAY TUTORIAL
      </p>
    </AbsoluteFill>
  );
};

// --- Scene: Step with title + bullets ---
const StepScene: React.FC<{ step: string; title: string; emoji: string; bullets: string[]; color: string }> = ({ step, title, emoji, bullets, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({ frame, fps, config: { damping: 20 } });
  const emojiScale = spring({ frame: frame - 5, fps, config: { damping: 8 } });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 100 }}>
      <div style={{ fontSize: 100, transform: `scale(${emojiScale})`, marginBottom: 20 }}>{emoji}</div>
      <p style={{ fontFamily: bodyFont, fontSize: 28, color: ACCENT, opacity: interpolate(headerIn, [0, 1], [0, 1]), letterSpacing: 6, marginBottom: 10 }}>{step}</p>
      <h2 style={{ fontFamily: titleFont, fontSize: 56, color, transform: `translateY(${interpolate(headerIn, [0, 1], [40, 0])}px)`, textShadow: `0 0 30px ${color}44`, textAlign: "center", marginBottom: 40 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
        {bullets.map((b, i) => {
          const bulletIn = spring({ frame: frame - 15 - i * 8, fps, config: { damping: 20 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity: bulletIn, transform: `translateX(${interpolate(bulletIn, [0, 1], [60, 0])}px)` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <p style={{ fontFamily: bodyFont, fontSize: 32, color: "#e0e0e0", fontWeight: 600 }}>{b}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// --- Scene: Outro ---
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 12 } });
  const glow = interpolate(frame, [0, 30, 60, 90], [0, 1, 0.6, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 100, transform: `scale(${scale})` }}>🐂🔑💎</div>
      <h2 style={{ fontFamily: titleFont, fontSize: 64, color: GOLD, marginTop: 30, textShadow: `0 0 ${40 * glow}px ${GOLD}`, textAlign: "center" }}>
        START YOUR JOURNEY
      </h2>
      <p style={{ fontFamily: bodyFont, fontSize: 32, color: ACCENT, marginTop: 20, opacity: interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" }) }}>
        Connect Wallet → Subscribe → Unlock Games → Earn Keys & Diamonds
      </p>
      <p style={{ fontFamily: bodyFont, fontSize: 24, color: "#888", marginTop: 40, opacity: interpolate(frame, [50, 80], [0, 1], { extrapolateRight: "clamp" }) }}>
        csbgamezone.lovable.app
      </p>
    </AbsoluteFill>
  );
};

// --- Main Video ---
export const TutorialVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <AnimatedBG />

      {/* Intro: 0-100 */}
      <Sequence from={0} durationInFrames={100}><IntroScene /></Sequence>

      {/* Step 1: Connect Wallet 100-200 */}
      <Sequence from={100} durationInFrames={100}>
        <StepScene step="STEP 1" title="Connect Your Wallet" emoji="💳" color={ACCENT} bullets={[
          "Click 'Connect Wallet' on the dashboard",
          "Use VESPR wallet for Cardano",
          "Or sign up with Email + Password",
          "Your profile is created automatically",
        ]} />
      </Sequence>

      {/* Step 2: Dashboard 200-300 */}
      <Sequence from={200} durationInFrames={100}>
        <StepScene step="STEP 2" title="Explore the Dashboard" emoji="🎮" color={GOLD} bullets={[
          "Play earning games: Bull Mining, Milk The Bull, Bull Kingdom",
          "Farm Diamonds 💎 and Credits 💰",
          "Check the Leaderboard for rankings",
          "Talk to the AI Game Master for tips",
        ]} />
      </Sequence>

      {/* Step 3: Subscribe 300-400 */}
      <Sequence from={300} durationInFrames={100}>
        <StepScene step="STEP 3" title="Subscribe for Bulls" emoji="🐂" color={BULL_RED} bullets={[
          "Tier 1: $5/mo → 1 Bull, 10% buff",
          "Tier 2: $15/mo → 4 Bulls, 40% buff",
          "Tier 3: $30/mo → 10 Bulls, 100% buff",
          "Bulls unlock 50+ Holder-Only games!",
        ]} />
      </Sequence>

      {/* Step 4: Holder Games 400-520 */}
      <Sequence from={400} durationInFrames={120}>
        <StepScene step="STEP 4" title="Play Holder Games" emoji="🔑" color="#9933FF" bullets={[
          "Strategy, RPG, trading & siege games",
          "Win Keys 🔑 boosted by bull count",
          "50+ advanced games to master",
          "Compete in Holders Season rankings",
        ]} />
      </Sequence>

      {/* Step 5: Customize 520-620 */}
      <Sequence from={520} durationInFrames={100}>
        <StepScene step="STEP 5" title="Customize & Collect" emoji="✨" color="#FF6B9D" bullets={[
          "Buy CSB Ambassador Badges (12 colors)",
          "Equip Starsign Runes (12 zodiac signs)",
          "Trade in the Bull World Marketplace",
          "Show off on the Leaderboard!",
        ]} />
      </Sequence>

      {/* Step 6: Bull World 620-720 */}
      <Sequence from={620} durationInFrames={100}>
        <StepScene step="STEP 6" title="Enter Bull World" emoji="🌍" color="#00FF88" bullets={[
          "Explore the multiplayer open world",
          "Collect diamonds scattered on the map",
          "Chat with other players in real-time",
          "Trade badges in the Marketplace",
        ]} />
      </Sequence>

      {/* Outro: 720-750 */}
      <Sequence from={720} durationInFrames={30}><OutroScene /></Sequence>
    </AbsoluteFill>
  );
};
