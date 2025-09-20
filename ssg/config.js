import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

export const paths = {
	rootDir,
	dist: path.join(rootDir, 'dist'),
	assets: path.join(rootDir, 'assets'),
	templates: path.join(rootDir, 'templates'),
	articles: path.join(rootDir, 'articles/index'),
	hashFile: path.join(rootDir, 'hashes.json'),
};

export const site = {
	title: 'números números números',
	description: 'Un proyecto independiente de análisis y reflexión.',
	origin: 'https://numerosnumerosnumeros.com',
	articlesBase: '/articulos',
	locale: 'es-ES',
};
