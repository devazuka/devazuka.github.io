SELECT *
FROM booking
WHERE mail = :mail
  AND open = :open
  AND space = :space
  AND close = :close
LIMIT 1
