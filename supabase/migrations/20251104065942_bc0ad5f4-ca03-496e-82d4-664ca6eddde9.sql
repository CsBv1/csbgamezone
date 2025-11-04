-- Update leaderboard view to use current balance instead of total_earned
DROP VIEW IF EXISTS leaderboard;

CREATE VIEW leaderboard AS
SELECT 
  p.id as user_id,
  p.username,
  p.avatar_url,
  COALESCE(ud.balance, 0) as total_diamonds,
  COUNT(DISTINCT gr.id) as total_games,
  COUNT(DISTINCT CASE WHEN gr.result = 'win' THEN gr.id END) as total_wins,
  ROW_NUMBER() OVER (ORDER BY COALESCE(ud.balance, 0) DESC) as rank
FROM profiles p
LEFT JOIN user_diamonds ud ON p.id = ud.user_id
LEFT JOIN game_results gr ON p.id = gr.user_id
GROUP BY p.id, p.username, p.avatar_url, ud.balance
ORDER BY total_diamonds DESC;