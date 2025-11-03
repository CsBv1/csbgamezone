-- Drop and recreate leaderboard view to include user_id
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ud.total_earned DESC, ud.balance DESC) AS rank,
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(ud.balance, 0) AS total_diamonds,
  COALESCE(COUNT(DISTINCT CASE WHEN gr.result = 'win' THEN gr.id END), 0) AS total_wins,
  COALESCE(COUNT(DISTINCT gr.id), 0) AS total_games
FROM profiles p
LEFT JOIN user_diamonds ud ON p.id = ud.user_id
LEFT JOIN game_results gr ON p.id = gr.user_id
WHERE ud.balance > 0 OR ud.total_earned > 0
GROUP BY p.id, p.username, p.avatar_url, ud.balance, ud.total_earned
ORDER BY ud.total_earned DESC, ud.balance DESC
LIMIT 25;