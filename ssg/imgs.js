import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileHash } from './utils.js';

const sizes = {
	sm: { width: 700, quality: 90 },
	md: { width: 1024, quality: 90 },
};

export async function processImage(absPath, relPath, distDir) {
	const ext = path.extname(relPath);
	const base = path.basename(relPath, ext);
	const dir = path.posix.dirname(relPath);

	const variants = {};

	for (const [label, { width, quality }] of Object.entries(sizes)) {
		const buffer = await sharp(absPath)
			.resize({
				width,
				withoutEnlargement: true,
				kernel: sharp.kernel.lanczos3,
			})
			.webp({
				quality,
				effort: 6,
			})
			.toBuffer();

		const hash = fileHash(buffer);
		const hashedName = `${base}.${label}.${hash}.webp`;
		const outPath = path.join(distDir, hashedName);

		await fs.promises.mkdir(distDir, { recursive: true });
		await fs.promises.writeFile(outPath, buffer);

		const relHashed = path.posix.join(dir, hashedName);
		variants[label] = relHashed;
	}

	return variants;
	// { sm: "img/foo.sm.<hash>.webp", md: "img/foo.md.<hash>.webp" }
}
