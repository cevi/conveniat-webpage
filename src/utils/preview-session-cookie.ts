/**
 * The name of the session cookie that indicates the admin has visited the
 * Payload admin panel during the current browser session. This cookie gates
 * the preview banner visibility on the frontend — admins only see the
 * preview bar after visiting `/admin`, and can dismiss it via the close
 * button (which deletes this cookie).
 *
 * This is a session cookie (no `max-age` / `expires`), so it is
 * automatically cleared when the browser is closed.
 */
export const PREVIEW_SESSION_COOKIE = 'payload-admin-visited';
