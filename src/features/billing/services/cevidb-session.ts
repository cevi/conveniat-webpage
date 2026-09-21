/**
 * What an operator reads when the stored Cevi.DB session is gone.
 *
 * The sync, the send and the write-back all hit the same wall, and none of them can do
 * anything but point at the one field that fixes it. Kept in one place so all three say
 * it the same way.
 */
export const CEVIDB_SESSION_EXPIRED_MESSAGE =
  'Die Cevi.DB-Sitzung ist abgelaufen, die Anfrage landete auf der Anmeldeseite. Bitte hinterlege einen neuen Browser-Cookie in den Registrierungs-Einstellungen.';
