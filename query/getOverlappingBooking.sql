SELECT b.*, c.amount AS cost
FROM booking AS b
LEFT JOIN credit AS c ON c.booking = b.id
WHERE b.mail = :mail
  AND b.space = :space
  AND b.open < :close
  AND b.close > :open

  -- no overlap:
  -- it close before the opening
  -- or it open after the closing

  -- overlap:
  -- it close after the opening
  -- and it open before the closing
LIMIT 1
