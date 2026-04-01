import { Composition } from "remotion";
import { TutorialVideo } from "./TutorialVideo";

export const RemotionRoot = () => (
  <Composition
    id="tutorial"
    component={TutorialVideo}
    durationInFrames={750}
    fps={30}
    width={1920}
    height={1080}
  />
);
