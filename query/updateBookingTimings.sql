-- tests only
UPDATE booking
  SET at = :at, open = :open, rm = :rm
WHERE id = :id
