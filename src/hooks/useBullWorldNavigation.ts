import { useNavigate } from "react-router-dom";

export const useBullWorldNavigation = () => {
  const navigate = useNavigate();
  
  const goBack = () => {
    const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
    const fromHoldersArena = sessionStorage.getItem('fromHoldersArena') === 'true';
    
    if (fromBullWorld) {
      sessionStorage.removeItem('fromBullWorld');
      navigate('/games/bull-world');
    } else if (fromHoldersArena) {
      sessionStorage.removeItem('fromHoldersArena');
      navigate('/games/holders-arena');
    } else {
      navigate('/');
    }
  };

  const getBackLabel = () => {
    const fromBullWorld = sessionStorage.getItem('fromBullWorld') === 'true';
    const fromHoldersArena = sessionStorage.getItem('fromHoldersArena') === 'true';
    
    if (fromBullWorld) return 'Back to Bull World';
    if (fromHoldersArena) return 'Back to Holders Arena';
    return 'Back to Dashboard';
  };

  return { goBack, getBackLabel };
};
