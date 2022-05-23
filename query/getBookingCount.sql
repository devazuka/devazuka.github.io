SELECT count(*)
FROM booking
WHERE space = :space
  AND open <= :close
  AND close >= :open
