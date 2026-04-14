import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = "https://guwplwuwriixgvkjlutg.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Bsd3V3cmlpeGd2a2psdXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MzE3MDYsImV4cCI6MjA2OTMwNzcwNn0.XqFnllTUiv1SZrnL23hy7pWWeIeWDldfm9lpfO3vIQg";
const BASE_URL = "https://www.camaleaoecoturismo.com.br";
const DEFAULT_IMAGE = `${BASE_URL}/lovable-uploads/4c5a26ff-aabf-4273-98a1-f151f7856c43.png`;
const SITE_NAME = "Camaleão Ecoturismo";

async function fetchSupabase(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function fetchTourCoverImage(tourId: string): Promise<string | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/tour_gallery_images?tour_id=eq.${encodeURIComponent(tourId)}&select=image_url&order=created_at.asc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data[0]?.image_url ? data[0].image_url : null;
}

function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
}): string {
  const { title, description, image, url } = opts;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="pt_BR" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />

  <link rel="canonical" href="${esc(url)}" />

  <!-- Redirect humans to the SPA -->
  <script>
    // If this page was opened by a real browser (not a bot), load the app normally
    if (typeof window !== 'undefined' && window.navigator && !window.navigator.webdriver) {
      // Replace with the SPA — the React app will take over routing
      var s = document.createElement('script');
      s.src = '/index.html';
      // Actually just navigate directly; the SPA handles /passeio/* and /blog/*
      window.location.replace('${esc(url)}');
    }
  </script>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
  <img src="${esc(image)}" alt="${esc(title)}" />
  <a href="${esc(url)}">Ver no site</a>
</body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type, slug } = req.query as Record<string, string>;

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // ── Passeio ──────────────────────────────────────────────────────────────
  if (type === "passeio" && slug) {
    // Don't filter by is_active — inactive tours should still have correct OG previews
    const tour = await fetchSupabase(
      `tours?select=id,name,about,image_url,slug&slug=eq.${encodeURIComponent(slug)}&limit=1`
    );

    if (tour) {
      const title = `${tour.name} — ${SITE_NAME}`;
      const description =
        (tour.about || "")
          .replace(/<[^>]*>/g, "")
          .slice(0, 160)
          .trim() ||
        `Reserve seu lugar no passeio ${tour.name} com a Camaleão Ecoturismo.`;

      // Prefer image_url from the tour, fallback to first gallery image, then default
      let image = tour.image_url as string | null;
      if (!image && tour.id) {
        image = await fetchTourCoverImage(tour.id);
      }
      image = image || DEFAULT_IMAGE;

      const url = `${BASE_URL}/passeio/${slug}`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildHtml({ title, description, image, url }));
    }
  }

  // ── Blog post ─────────────────────────────────────────────────────────────
  if (type === "blog" && slug) {
    const post = await fetchSupabase(
      `blog_posts?select=titulo,excerpt,meta_description,cover_image,slug&slug=eq.${encodeURIComponent(slug)}&publicado=eq.true&limit=1`
    );

    if (post) {
      const title = `${post.titulo} — ${SITE_NAME}`;
      const description =
        post.meta_description || post.excerpt || `Leia no blog da Camaleão Ecoturismo.`;
      const image = post.cover_image || DEFAULT_IMAGE;
      const url = `${BASE_URL}/blog/${slug}`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(buildHtml({ title, description, image, url }));
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return res.redirect(302, BASE_URL);
}
