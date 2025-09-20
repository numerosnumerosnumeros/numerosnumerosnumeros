import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileHash, getCssVar } from './utils.js';

const sizes = {
	sm: { width: 500, quality: 90 },
	md: { width: 900, quality: 90 },
};

const mainColor = getCssVar('color-primary');

export async function processImage(absPath, relPath, distDir) {
	const ext = path.extname(relPath);
	const base = path.basename(relPath, ext);
	const dir = path.posix.dirname(relPath);

	const variants = {};

	for (const [label, { width, quality }] of Object.entries(sizes)) {
		// Step 1: resize input to target width, grayscale for clean channel math
		const resized = sharp(absPath)
			.resize({
				width,
				withoutEnlargement: true,
				kernel: sharp.kernel.lanczos3,
				fit: 'inside',
			})
			.removeAlpha()
			.toColourspace('b-w');

		const lineArtBuffer = await resized.toBuffer();

		const { width: w, height: h } = await sharp(lineArtBuffer).metadata();

		// Step 2: create solid blue canvas (same size as resized image)
		const blueBg = sharp({
			create: {
				width: w,
				height: h,
				channels: 3,
				background: mainColor,
			},
		});

		// Step 3: composite black lines on top of blue
		// use "darken": keeps black lines intact, replaces white with background
		const buffer = await blueBg
			.composite([{ input: lineArtBuffer, blend: 'darken' }])
			.webp({ quality, effort: 6, smartSubsample: true })
			.toBuffer();

		// Step 4: save hashed result
		const hash = fileHash(buffer);
		const hashedName = `${base}.${label}.${hash}.webp`;
		const outPath = path.join(distDir, hashedName);

		await fs.promises.mkdir(distDir, { recursive: true });
		await fs.promises.writeFile(outPath, buffer);

		const relHashed = path.posix.join(dir, hashedName);
		variants[label] = relHashed;
	}

	return variants;
}
