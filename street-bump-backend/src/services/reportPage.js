const TITLE = 'Baches nuevos en Hermosillo';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es-MX', {
        timeZone: 'America/Hermosillo', year: 'numeric', month: 'long', day: 'numeric',
    });

const place = ({ address, location }) =>
    address || `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`;

const card = (bump, baseUrl) => `
    <article>
      <img src="${escapeHtml(bump.imageUrl)}" alt="Foto del bache" loading="lazy">
      <div class="info">
        <p class="place">${escapeHtml(place(bump))}</p>
        <p class="date">Reportado el ${escapeHtml(formatDate(bump.createdAt))}</p>
        <a href="${escapeHtml(`${baseUrl}/?bache=${encodeURIComponent(bump.id)}`)}">Ver en el mapa</a>
      </div>
    </article>`;

function renderReportPage({ bumps, baseUrl }) {
    const count = bumps.length;
    const heading = count === 1 ? '1 bache nuevo en Hermosillo' : `${count} baches nuevos en Hermosillo`;
    const title = count ? heading : TITLE;
    const description = count
        ? 'Reportados por la ciudadanía, con foto y ubicación.'
        : 'No hubo baches nuevos ayer.';
    const image = count
        ? `<meta property="og:image" content="${escapeHtml(bumps[0].imageUrl)}">`
        : '';
    const body = count
        ? bumps.map((bump) => card(bump, baseUrl)).join('')
        : `<p class="empty">No hubo baches nuevos ayer. <a href="${escapeHtml(baseUrl)}">Ver el mapa</a></p>`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(TITLE)}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(`${baseUrl}/bachesNuevos`)}">
  ${image}
  <meta name="twitter:card" content="summary_large_image">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #fff7ed; color: #431407; }
    main { max-width: 560px; margin: 0 auto; }
    h1 { font-size: 1.35rem; }
    article { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    article img { display: block; width: 100%; height: 240px; object-fit: cover; }
    .info { padding: 12px 16px 16px; }
    .info p { margin: 0 0 6px; }
    .place { font-weight: 600; }
    .date { font-size: .85rem; color: #78716c; }
    a { color: #c2410c; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>🚧 ${escapeHtml(title)}</h1>${body}
  </main>
</body>
</html>`;
}

module.exports = { escapeHtml, renderReportPage };
