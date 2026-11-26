const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const OFFLINE_MESSAGE = 'No internet connection. Connect to the internet and try again.';

// True when the PaisaBook server can be reached right now. Any reply counts, even an error
// reply, because it proves the request left the phone and came back.
export async function isOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
