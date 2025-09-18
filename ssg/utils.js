import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { minify as _minify } from 'html-minifier-terser';
import { paths } from './config.js';

export function fileHash(input) {
	const hash = crypto.createHash('md5');
	let buf;

	if (Buffer.isBuffer(input)) {
		buf = input; // already a buffer
	} else {
		buf = fs.readFileSync(input); // input is a path
	}

	return hash.update(buf).digest('hex').slice(0, 8);
}

export function loadHashes(hashFilePath) {
	return fs.existsSync(hashFilePath)
		? JSON.parse(fs.readFileSync(hashFilePath, 'utf-8'))
		: {};
}

export function saveHashes(hashFilePath, hashes) {
	fs.writeFileSync(hashFilePath, JSON.stringify(hashes, null, 2), 'utf-8');
}

export function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const escAttr = (s) =>
	String(s)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;');

export function slugify(str) {
	return String(str || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9\s-]/g, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-');
}

// Ensure unique slugs (adds -2, -3, ... if duplicates)
export function uniqueSlugs(items, getBase, setSlug) {
	const seen = new Map();
	for (const it of items) {
		const base = slugify(getBase(it));
		let s = base || 'articulo';
		let n = 1;
		while (seen.has(s)) {
			n += 1;
			s = `${base}-${n}`;
		}
		seen.set(s, true);
		setSlug(it, s);
	}
}

export function formatDate(isoDate, locale = 'es-ES') {
	return new Date(isoDate).toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function hrefFor(a, base) {
	if (a.link) return a.link;
	if (a.isTopLevel) return `/${a.slug}.html`;
	return `${base}/${a.slug}.html`;
}

export function absoluteUrlFor(a, origin, base) {
	if (a.link) return a.link;
	if (a.isTopLevel) return `${origin}/${a.slug}.html`;
	return `${origin}${base}/${a.slug}.html`;
}

// Prefer a marker; otherwise inject after </nav>
export function injectContent(template, html) {
	if (template.includes('<!-- CONTENT -->')) {
		return template.replace('<!-- CONTENT -->', html);
	}
	const re = /<\/nav>\s*<\/div>/i;
	if (re.test(template)) {
		return template.replace(re, `</nav>${html}</div>`);
	}
	// Fallback before footer
	return template.replace(/<\/div>\s*<footer>/i, `${html}</div><footer>`);
}

export async function minify(html) {
	return _minify(html, {
		collapseWhitespace: true,
		removeComments: true,
		removeRedundantAttributes: true,
		removeEmptyAttributes: true,
		useShortDoctype: true,
		minifyCSS: true,
		minifyJS: true,
	});
}

export function generateCSP(distDir) {
	const indexPath = path.join(distDir, 'index.html');
	if (!fs.existsSync(indexPath)) {
		console.warn('⚠️ index.html not found for CSP hash');
		return;
	}

	const html = fs.readFileSync(indexPath, 'utf-8');

	const matches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
	const gaScript = matches
		.map((m) => m[1].trim())
		.find((s) => s.includes('gtag('));

	if (!gaScript) {
		console.warn('⚠️ GA inline snippet not found in index.html');
		return;
	}

	const hash = crypto.createHash('sha256').update(gaScript).digest('base64');
	const cspValue = `'sha256-${hash}'`; // <-- quotes

	const header = [
		"default-src 'self';",
		`script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com ${cspValue};`,
		"connect-src 'self' https://*.google-analytics.com;",
		"img-src 'self' https://www.google-analytics.com data:;",
		"style-src 'self' 'unsafe-inline';",
		"object-src 'none'; frame-ancestors 'none'; base-uri 'self';",
	].join(' ');

	const cspFile = path.join(process.cwd(), 'csp.json');
	fs.writeFileSync(
		cspFile,
		JSON.stringify(
			{
				'ga-snippet': cspValue,
				'content-security-policy': header,
			},
			null,
			2
		),
		'utf-8'
	);

	console.log('🔒 CSP hash + header written to csp.json');
}
