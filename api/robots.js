const PRODUCTION_ROBOTS = `# robots.txt — CustomCard
# https://customcard-three.vercel.app

# Allow all standard crawlers
User-agent: *
Allow: /

# Allow AI search-and-cite crawlers explicitly
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Block training-only crawlers (does not affect search or citation)
User-agent: CCBot
Disallow: /

User-agent: cohere-ai
Disallow: /

# Sitemaps
Sitemap: https://customcard-three.vercel.app/sitemap.xml
`;

const PREVIEW_ROBOTS = `User-agent: *
Disallow: /
`;

export default function handler(request, response) {
  const isProduction = process.env.VERCEL_ENV === "production";
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "public, max-age=3600");
  response.status(200).send(isProduction ? PRODUCTION_ROBOTS : PREVIEW_ROBOTS);
}
