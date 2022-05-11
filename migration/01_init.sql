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

CREATE TABLE IF NOT EXISTS experience (
  id       INTEGER PRIMARY KEY,
  at       INTEGER NOT NULL, -- time where registration open
  rm       INTEGER,          -- when the experience is canceled
  by       TEXT    NOT NULL, -- experience author
  name     TEXT    NOT NULL, -- name of the experience
  close    INTEGER NOT NULL, -- ending time
  cost     INTEGER NOT NULL DEFAULT 0, -- how many credits to pay
  open     INTEGER NOT NULL, -- begining time
  capacity INTEGER NOT NULL, -- capacity (min 1 max 80)
  FOREIGN KEY(by) REFERENCES user(mail)
);

CREATE TABLE IF NOT EXISTS booking (
  id    INTEGER PRIMARY KEY,
  at    INTEGER NOT NULL, -- when the token was issued
  mail  TEXT    NOT NULL, -- user mail
  for   INTEGER NOT NULL, -- related experience
  start INTEGER,          -- date of the booking
  rm    INTEGER,          -- time of cancelation
  FOREIGN KEY(mail) REFERENCES user(mail),
  FOREIGN KEY(for) REFERENCES experience(id),
  UNIQUE(mail, for, start)
);

-- https://excalidraw.com/#json=W199PtbbisfT_8AntyWz3,wvBceu8fC3kPjbyHHHONkw
