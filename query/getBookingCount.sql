SELECT count(*)
FROM booking
WHERE type = :type
  AND open <= :close
  AND close >= :open
