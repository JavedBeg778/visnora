const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#2563EB"/>
  <path d="M14 18h9l9 23 9-23h9L36 49h-8L14 18Z" fill="#FFFFFF"/>
</svg>`;

export function GET() {
  return new Response(icon, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
