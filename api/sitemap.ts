import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const BASE_URL = "https://www.camaleaoecoturismo.com.br";

async function fetchSupabase(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

function escapeXml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const [tours, posts] = await Promise.all([
    fetchSupabase("tours?select=slug,id,start_date&is_active=eq.true&order=start_date.asc"),
    fetchSupabase("blog_posts?select=slug,published_at&publicado=eq.true&order=published_at.desc"),
  ]);

  const staticPages = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${BASE_URL}/blog`, priority: "0.9", changefreq: "weekly" },
    { loc: `${BASE_URL}/sobre`, priority: "0.6", changefreq: "monthly" },
    { loc: `${BASE_URL}/faq`, priority: "0.6", changefreq: "monthly" },
    { loc: `${BASE_URL}/chapada-diamantina`, priority: "0.8", changefreq: "monthly" },
    { loc: `${BASE_URL}/organizacoes`, priority: "0.5", changefreq: "monthly" },
    { loc: `${BASE_URL}/equipe`, priority: "0.5", changefreq: "monthly" },
  ];

  const tourPages = (tours as any[]).map((t) => ({
    loc: `${BASE_URL}/passeio/${escapeXml(t.slug || t.id)}`,
    lastmod: t.start_date || undefined,
    priority: "0.9",
    changefreq: "weekly",
  }));

  const blogPages = (posts as any[]).map((p) => ({
    loc: `${BASE_URL}/blog/${escapeXml(p.slug)}`,
    lastmod: p.published_at ? p.published_at.split("T")[0] : undefined,
    priority: "0.8",
    changefreq: "monthly",
  }));

  const allUrls = [...staticPages, ...tourPages, ...blogPages];

  const urlEntries = allUrls
    .map(({ loc, lastmod, priority, changefreq }: any) => {
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.status(200).send(xml);
}
