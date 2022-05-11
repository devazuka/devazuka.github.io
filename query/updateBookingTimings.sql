-- tests only
UPDATE booking
SET at=:at, start=:start
WHERE id=:id
