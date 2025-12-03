import { useNavigate } from "react-router-dom";

export const useBullWorldNavigation = () => {
  const navigate = useNavigate();
  
  const goBack = () => {
    const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
    if (fromBullWorld) {
      sessionStorage.removeItem('fromBullWorld');
      navigate('/games/bull-world');
    } else {
      navigate('/games');
    }
  };

  const getBackLabel = () => {
    const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
    return fromBullWorld ? 'Back to Bull World' : 'Back to Games';
  };

  return { goBack, getBackLabel };
};
