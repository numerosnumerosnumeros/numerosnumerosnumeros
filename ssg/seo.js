import fs from 'fs';
import path from 'path';
import { absoluteUrlFor } from './utils.js';
import { site, paths } from './config.js';

export function buildIndexJsonLd(latest, assetMap) {
	const website = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'@id': site.origin + '/',
		name: 'números números números',
		url: site.origin + '/',
	};

	const blog = {
		'@context': 'https://schema.org',
		'@type': 'Blog',
		name: 'números números números',
		url: site.origin + '/',
		description: 'Artículos de números números números.',
		blogPost: latest.map((a) => ({
			'@id': absoluteUrlFor(a, site.origin, site.articlesBase),
		})),
	};

	return JSON.stringify([website, blog]);
}

export function buildArticleJsonLd(article, assetMap) {
	const img =
		article.img && assetMap[article.img]
			? `${site.origin}/${assetMap[article.img].md}`
			: undefined;
	return JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: article.title,
		description: article.description || article.title,
		datePublished: article.date,
		dateModified: article.date,
		wordcount: article.content
			? article.content.split(/\s+/).length
			: undefined,
		author: article.author
			? {
					'@type': 'Person',
					name: article.author,
					...(article.authorLink && { url: article.authorLink }),
			  }
			: { '@type': 'Organization', name: 'números números números' },
		publisher: {
			'@type': 'Organization',
			name: 'números números números',
			logo: { '@type': 'ImageObject', url: site.origin + '/favicon.png' },
		},
		mainEntityOfPage: {
			'@type': 'WebPage',
			'@id': absoluteUrlFor(article, site.origin, site.articlesBase),
		},
		...(img && { image: img }),
	});
}

export function writeRobotsTxt() {
	const robots = `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`;
	fs.writeFileSync(path.join(paths.dist, 'robots.txt'), robots, 'utf-8');
}

export function writeSitemap(articles, totalPages) {
	const today = new Date().toISOString().split('T')[0];
	const urls = [
		`<url><loc>${site.origin}/</loc><lastmod>${today}</lastmod></url>`,
		...Array.from({ length: totalPages - 1 }, (_, i) => {
			const page = i + 2;
			return `<url><loc>${site.origin}/page/${page}.html</loc><lastmod>${today}</lastmod></url>`;
		}),
		...articles
			.filter((a) => !a.link)
			.map((a) => {
				const loc = absoluteUrlFor(a, site.origin, site.articlesBase);
				return `<url><loc>${loc}</loc><lastmod>${a.date}</lastmod></url>`;
			}),
	];
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
		'\n'
	)}\n</urlset>`;
	fs.writeFileSync(path.join(paths.dist, 'sitemap.xml'), sitemap, 'utf-8');
}
