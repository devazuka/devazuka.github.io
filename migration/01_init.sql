CREATE TABLE IF NOT EXISTS user (
  at   INTEGER NOT NULL, -- time joined
  mail TEXT    NOT NULL PRIMARY KEY,
  name TEXT    NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS session (
  id   INTEGER PRIMARY KEY,
  at   INTEGER NOT NULL, -- when the token was issued
  rm   INTEGER,          -- when the session is removed
  ip   TEXT    NOT NULL, -- request ip
  ua   TEXT    NOT NULL, -- user agent
  mail TEXT    NOT NULL, -- user mail
  FOREIGN KEY(mail) REFERENCES user(mail)
);

CREATE TABLE IF NOT EXISTS credit (
  id      INTEGER PRIMARY KEY,
  at      INTEGER NOT NULL, -- time of the transaction
  mail    TEXT    NOT NULL, -- mail of the user recieving the credits
  by      TEXT    NOT NULL, -- who granted the credits, server when it's from payement
  amount  INTEGER NOT NULL,
  booking INTEGER,          -- optional linked booking
  FOREIGN KEY(booking) REFERENCES booking(id),
  FOREIGN KEY(mail) REFERENCES user(mail),
  FOREIGN KEY(by) REFERENCES user(mail)
);

-- for getLastCreditForBooking
CREATE INDEX IF NOT EXISTS by_booking ON credit (booking, at);

-- for allBalances
CREATE INDEX IF NOT EXISTS by_balance ON credit (mail, amount);

CREATE TABLE IF NOT EXISTS space (
  name     TEXT    NOT NULL PRIMARY KEY
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS booking (
  id    INTEGER PRIMARY KEY,
  at    INTEGER NOT NULL, -- when the token was issued
  mail  TEXT    NOT NULL, -- user mail
  space INTEGER NOT NULL, -- related space
  open  INTEGER,          -- begining time of the booking
  close INTEGER NOT NULL, -- ending time of the booking
  rm    INTEGER,          -- time of cancelation
  FOREIGN KEY(mail) REFERENCES user(mail),
  FOREIGN KEY(space) REFERENCES space(name),
  UNIQUE(mail, space, open, close)
);

-- https://excalidraw.com/#json=W199PtbbisfT_8AntyWz3,wvBceu8fC3kPjbyHHHONkw
