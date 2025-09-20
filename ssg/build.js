import fs, { rmSync } from 'fs';
import path from 'path';
import { paths, site } from './config.js';
import {
	formatDate,
	hrefFor,
	injectContent,
	minify,
	escAttr,
	generateCSP,
	injectRssLink,
} from './utils.js';
import { processAssets } from './assets.js';
import { loadTemplateWithExtras, updateHeadPerArticle } from './templates.js';
import {
	buildArticleJsonLd,
	buildIndexJsonLd,
	writeRobotsTxt,
	writeSitemap,
	writeRSS,
} from './seo.js';
import { loadArticles } from './fetch.js';

const ARTICLES_ON_LANDING = 4;
const ARTICLES_PER_PAGE = 3;

function renderArticlesList(articles, assetMap, { isLanding = false } = {}) {
	return `<ul class="landing-list">
        ${articles
					.filter((a) => !a.isTopLevel)
					.map((a, i) => {
						const href = hrefFor(a, site.articlesBase);
						const target = a.link
							? ' target="_blank" rel="noopener noreferrer"'
							: '';

						const isFirst = isLanding && i === 0;

						const imgTag =
							a.img && assetMap[a.img]
								? `<img class="${
										isFirst ? 'landing-thumb-featured' : 'landing-thumb'
								  }" 
                                src="/${assetMap[a.img].sm}"
                                alt="${escAttr(a.title)}"
                                width="500"
                                height="500"
                        ${
													isFirst
														? 'fetchpriority="high" decoding="async"'
														: 'loading="lazy" decoding="async"'
												}>`
								: '';

						const authorTag = a.author
							? `<p class="article-author">${escAttr(a.author)}</p>`
							: '';

						if (isFirst) {
							// featured layout for landing page first item
							return `<li class="landing-item-featured">
                                <a class="landing-link-featured" href="${href}"${target}>
                                    <div class="landing-item-text-featured">
                                        <p class="landing-title-featured">${escAttr(
																					a.title
																				)}</p>
                                        <div class="landing-item-meta-featured">
                                            ${authorTag}
                                            <p class="date">${formatDate(
																							a.date,
																							site.locale
																						)}</p>
                                        </div>
                                    </div>
                                    ${imgTag}
                                </a>
                            </li>`;
						}

						// layout for all others
						return `<li class="landing-item">
                                        <a class="landing-link" href="${href}"${target}>
                                            ${imgTag}
                                            <div class="landing-item-text">
                                                <p class="landing-title">${escAttr(
																									a.title
																								)}</p>
                                                <div class="landing-item-meta">
                                                    <p class="date">${formatDate(
																											a.date,
																											site.locale
																										)}</p>
                                                    ${authorTag}
                                                </div>
                                            </div>
                                        </a>
                                    </li>`;
					})
					.join('\n')}
        </ul>`;
}

function paginate(array) {
	const pages = [];
	for (let i = 0; i < array.length; i += ARTICLES_PER_PAGE) {
		pages.push(array.slice(i, i + ARTICLES_PER_PAGE));
	}
	return pages;
}

function buildMoreBtn(nextUrl) {
	return nextUrl
		? `<div class="load-more">
			<a href="${nextUrl}" class="load-more-link">Ver más</a>
			<noscript><a href="${nextUrl}">Ver más</a></noscript>
		  </div>`
		: '';
}

// BUILD
async function build() {
	// clean dist
	if (fs.existsSync(paths.dist)) {
		rmSync(paths.dist, { recursive: true, force: true });
		if (fs.existsSync(paths.dist)) {
			console.error('❌ Failed to remove dist directory');
		}
	}
	fs.mkdirSync(paths.dist, { recursive: true });

	// assets
	const { assetMap } = await processAssets();

	// content
	const articles = loadArticles(paths.articles);
	const latestArticles = articles
		.filter((a) => !a.isTopLevel)
		.slice(0, ARTICLES_ON_LANDING);

	// pagination
	const remainingArticles = articles
		.filter((a) => !a.isTopLevel)
		.slice(ARTICLES_ON_LANDING);
	const paginated = paginate(remainingArticles);

	// template
	const jsonLdMin = buildIndexJsonLd(latestArticles, assetMap);
	const baseTemplate = loadTemplateWithExtras(assetMap, jsonLdMin);

	// index.html
	const listHtml = renderArticlesList(latestArticles, assetMap, {
		isLanding: true,
	});
	let indexHtml = injectContent(baseTemplate, listHtml);
	indexHtml = injectRssLink(indexHtml);

	if (paginated.length > 0) {
		indexHtml = indexHtml.replace(
			'</head>',
			`<link rel="next" href="/page/2.html">`
		);

		const moreBtn = buildMoreBtn('/page/2.html');
		indexHtml = indexHtml.replace('</ul>', `</ul>${moreBtn}`);
	}

	fs.writeFileSync(
		path.join(paths.dist, 'index.html'),
		await minify(indexHtml),
		'utf-8'
	);

	if (paginated.length > 0) {
		for (let i = 0; i < paginated.length; i++) {
			const pageArticles = paginated[i];
			const jsonLdMin = buildIndexJsonLd(pageArticles, assetMap);
			let html = loadTemplateWithExtras(assetMap, jsonLdMin);

			const listHtml = renderArticlesList(pageArticles, assetMap);

			const prevUrl = i === 0 ? '/' : `/page/${i + 1}.html`;
			const nextUrl = i + 1 < paginated.length ? `/page/${i + 3}.html` : null;

			const moreBtn = nextUrl ? buildMoreBtn(nextUrl) : '';
			html = injectContent(html, listHtml);
			html = injectRssLink(html);
			html = html.replace('</ul>', `</ul>${moreBtn}`);

			// Canonical + prev/next link tags
			const prevLink = `<link rel="prev" href="${prevUrl}">`;
			const nextLink = nextUrl ? `<link rel="next" href="${nextUrl}">` : '';
			const canonUrl = `${site.origin}/page/${i + 2}.html`;
			const canonLink = `<link rel="canonical" href="${canonUrl}">`;

			if (html.includes('rel="canonical"')) {
				html = html.replace(/<link[^>]+rel="canonical"[^>]+>/i, canonLink);
			} else {
				html = html.replace('</head>', `${canonLink}</head>`);
			}

			html = html.replace('</head>', `${prevLink}${nextLink}</head>`);

			const pageFile = path.join(paths.dist, 'page', `${i + 2}.html`);
			fs.mkdirSync(path.dirname(pageFile), { recursive: true });
			fs.writeFileSync(pageFile, await minify(html), 'utf-8');
		}
	}

	// each article (internal only)
	const articleDir = path.join(
		paths.dist,
		site.articlesBase.replace(/^\//, '')
	);
	fs.mkdirSync(articleDir, { recursive: true });

	for (const article of articles) {
		if (article.link) continue; // external: don’t build a file

		const articleJsonLd = buildArticleJsonLd(article, assetMap);
		let html = loadTemplateWithExtras(assetMap, articleJsonLd);
		html = updateHeadPerArticle(html, article, assetMap);

		const articleHeader = `
        <h1 class="article-title">${escAttr(article.title)}</h1>
        ${
					article.author
						? article.authorLink
							? `<div class="article-sub"><p class="date">${formatDate(
									article.date,
									site.locale
							  )}</p><p class="article-author"><a href="${
									article.authorLink
							  }" target="_blank" rel="noopener noreferrer">${escAttr(
									article.author
							  )}</a><svg
								class="author-link-icon"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path d="M7 17L17 7M17 7H7M17 7V17" />
							</svg></p></div>`
							: `<div class="article-sub"><p class="date">${formatDate(
									article.date,
									site.locale
							  )}</p><p class="article-author">${escAttr(
									article.author
							  )}</p></div>`
						: ''
				}
        `;

		const imageTag =
			article.img && assetMap[article.img]
				? `<img class="article-image"
				src="/${assetMap[article.img].md}"
                srcset="/${assetMap[article.img].sm} 500w, /${
						assetMap[article.img].md
				  } 900w"
                sizes="100vw"
                width="900"
                height="900"
				alt="${escAttr(article.title)}"
                fetchpriority="high">`
				: '';

		html = injectContent(html, articleHeader + imageTag + article.content);
		html = injectRssLink(html);

		if (article.isTopLevel) {
			// root
			fs.writeFileSync(
				path.join(paths.dist, `${article.slug}.html`),
				await minify(html),
				'utf-8'
			);
		} else {
			// under /articulos/
			fs.writeFileSync(
				path.join(articleDir, `${article.slug}.html`),
				await minify(html),
				'utf-8'
			);
		}
	}

	writeRobotsTxt();
	writeSitemap(articles, paginated.length + 1);
	writeRSS(articles, 12);

	const icoSrc = path.join(paths.rootDir, 'favicon.ico');
	const icoDest = path.join(paths.dist, 'favicon.ico');

	if (fs.existsSync(icoSrc)) {
		fs.copyFileSync(icoSrc, icoDest);
		console.log('✅ favicon.ico copied to dist');
	} else {
		console.warn('⚠️ No favicon.ico found in project root, skipping copy.');
	}

	generateCSP(paths.dist);
	console.log('✅ SSG completed');
}

build();
