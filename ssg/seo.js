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
	const robots = `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\nSitemap: ${site.origin}/rss.xml\n`;
	fs.writeFileSync(path.join(paths.dist, 'robots.txt'), robots, 'utf-8');
}

export function writeSitemap(articles, totalPages) {
	const today = new Date().toISOString().split('T')[0];
	const urls = [
		`<url><loc>${site.origin}/</loc><lastmod>${today}</lastmod></url>`,
		...Array.from({ length: totalPages - 1 }, (_, i) => {
			const page = i + 2; // pages start at 2.html
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

export function writeRSS(articles, limit = 20) {
	const latest = articles
		.filter((a) => !a.link && !a.isTopLevel) // only real articles
		.sort((a, b) => new Date(b.date) - new Date(a.date))
		.slice(0, limit);

	const rssItems = latest
		.map((a) => {
			const url = absoluteUrlFor(a, site.origin, site.articlesBase);
			const pubDate = new Date(a.date).toUTCString();

			return `
                <item>
                    <title><![CDATA[${a.title}]]></title>
                    <link>${url}</link>
                    <guid isPermaLink="true">${url}</guid>
                    <pubDate>${pubDate}</pubDate>
                    ${
											a.author
												? `<dc:creator><![CDATA[${a.author}]]></dc:creator>`
												: ''
										}
                </item>`;
		})
		.join('\n');

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0"
                    xmlns:dc="http://purl.org/dc/elements/1.1/"
                    xmlns:atom="http://www.w3.org/2005/Atom">
                    <channel>
                        <title><![CDATA[${site.title}]]></title>
                        <link>${site.origin}</link>
                        <description><![CDATA[${
													site.description
												}]]></description>
                        <language>${site.locale || 'en'}</language>
                        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
                        <atom:link href="${
													site.origin
												}/rss.xml" rel="self" type="application/rss+xml"/>
                        ${rssItems}
                    </channel>
                </rss>`;

	fs.writeFileSync(path.join(paths.dist, 'rss.xml'), rss, 'utf-8');
	console.log(
		`✅ RSS feed written with ${latest.length} articles (no descriptions)`
	);
}
