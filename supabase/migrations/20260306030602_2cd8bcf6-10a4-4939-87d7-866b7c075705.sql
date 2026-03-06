-- Ensure holder season points can be upserted safely per user/season
CREATE UNIQUE INDEX IF NOT EXISTS holder_season_points_season_user_uidx
ON public.holder_season_points (season_id, user_id);

-- Ensure diamond wins are automatically converted into holder season points
DROP TRIGGER IF EXISTS trg_add_holder_season_points ON public.game_results;
CREATE TRIGGER trg_add_holder_season_points
AFTER INSERT ON public.game_results
FOR EACH ROW
EXECUTE FUNCTION public.add_holder_season_points();