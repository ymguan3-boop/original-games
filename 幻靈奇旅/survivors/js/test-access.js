const DIGEST='f12eb165d9fc9237560f1361c7e2e3d882ff972e90ab4af94afaa2a827170794';
export async function verifyTestPassword(value){if(!/^\d{6}$/.test(String(value)))return false;const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')===DIGEST;}
