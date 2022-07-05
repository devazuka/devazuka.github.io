SELECT *
FROM booking
WHERE mail = :mail
  AND open = :open
  AND type = :type
  AND close = :close
LIMIT 1
