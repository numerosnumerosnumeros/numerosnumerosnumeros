import fs from 'fs';
import path from 'path';
import { escapeRegex, escAttr, absoluteUrlFor } from './utils.js';
import { site, paths } from './config.js';

export function loadTemplateWithExtras(assetMap, jsonLdMin) {
	const template = fs
		.readFileSync(path.join(paths.templates, 'template.html'), 'utf-8')
		.trim();

	let out = template.replace(
		/<\/head>/i,
		`<script type="application/ld+json">${jsonLdMin}</script></head>`
	);

	for (const [orig, hashed] of Object.entries(assetMap)) {
		if (typeof hashed === 'string') {
			const re = new RegExp(`/?${escapeRegex(orig)}`, 'g');
			out = out.replace(re, `/${hashed}`);
		}
	}
	return out;
}

// PER ARTICLE HEAD TAGS
export function updateHeadPerArticle(html, article, assetMap) {
	const canonical = absoluteUrlFor(article, site.origin, site.articlesBase);
	const title = escAttr(article.title || '');
	const desc = escAttr(article.description || article.title || '');
	const canonAttr = escAttr(canonical);

	let out = html;

	// <title>
	out = out.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);

	// <meta name="description">
	if (/<meta\s+name="description"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
			`<meta name="description" content="${desc}">`
		);
	}

	// canonical + og/twitter utl
	if (/<link\s+rel="canonical"[^>]*>/i.test(out)) {
		out = out.replace(
			/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
			`<link rel="canonical" href="${canonAttr}">`
		);
	}
	if (/<meta\s+property="og:url"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
			`<meta property="og:url" content="${canonAttr}">`
		);
	}

	// og/twitter titles
	if (/<meta\s+property="og:title"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
			`<meta property="og:title" content="${title}">`
		);
	}
	if (/<meta\s+name="twitter:title"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
			`<meta name="twitter:title" content="${title}">`
		);
	}

	// og/twitter descriptions
	if (/<meta\s+property="og:description"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
			`<meta property="og:description" content="${desc}">`
		);
	}
	if (/<meta\s+name="twitter:description"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
			`<meta name="twitter:description" content="${desc}">`
		);
	}

	// force article type if present
	if (/<meta\s+property="og:type"[^>]*>/i.test(out)) {
		out = out.replace(
			/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
			`<meta property="og:type" content="article">`
		);
	}

	// article-specific og/twitter image
	if (article.img && assetMap[article.img]) {
		const ogImageAttr = escAttr(`${site.origin}/${assetMap[article.img].md}`);
		out = out.replace(
			/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
			`<meta property="og:image" content="${ogImageAttr}">`
		);
		out = out.replace(
			/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
			`<meta name="twitter:image" content="${ogImageAttr}">`
		);
	}

	return out;
}
