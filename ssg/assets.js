import fs from 'fs';
import path from 'path';
import { fileHash, loadHashes, saveHashes } from './utils.js';
import { processImage } from './imgs.js';
import { paths } from './config.js';

export async function processAssets() {
	const hashes = loadHashes(paths.hashFile);
	const assetMap = {};

	if (!fs.existsSync(paths.assets)) {
		console.warn(`⚠️  No assets folder at ${paths.assets}`);
		return { assetMap, hashes };
	}

	const walk = async (absDir, relBase = '') => {
		const entries = fs.readdirSync(absDir, { withFileTypes: true });
		for (const entry of entries) {
			const rel = path.posix.join(relBase, entry.name);
			const abs = path.join(absDir, entry.name);

			if (entry.isDirectory()) {
				await walk(abs, rel);
				continue;
			}

			const ext = path.extname(entry.name).toLowerCase();
			const destDir = path.join(paths.dist, path.posix.dirname(rel));
			fs.mkdirSync(destDir, { recursive: true });

			if (['.html', '.txt', '.xml'].includes(ext)) {
				fs.copyFileSync(abs, path.join(paths.dist, rel));
				assetMap[rel] = rel;
				continue;
			}

			if (ext.match(/\.(jpe?g|png)$/i) && rel.startsWith('img/')) {
				const variants = await processImage(abs, rel, destDir);
				assetMap[rel] = variants;
				continue;
			}

			const newHash = fileHash(abs);
			const hash = hashes[rel] === newHash ? hashes[rel] : newHash;
			hashes[rel] = hash;

			const base = path.basename(entry.name, ext);
			const hashedRel = path.posix.join(
				path.posix.dirname(rel),
				`${base}.${hash}${ext}`
			);
			fs.copyFileSync(abs, path.join(paths.dist, hashedRel));
			assetMap[rel] = hashedRel;
		}
	};

	await walk(paths.assets);
	saveHashes(paths.hashFile, hashes);
	console.log(`📦 Processed assets recursively`);
	return { assetMap, hashes };
}
