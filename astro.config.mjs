// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Drizzle Cube',
			description: 'Drizzle Cube: Open Source Embedded Analytics',
			favicon: '/favicon-32x32.png',
			head: [
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						type: 'image/png',
						sizes: '16x16',
						href: '/favicon-16x16.png',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						type: 'image/png',
						sizes: '32x32',
						href: '/favicon-32x32.png',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'icon',
						type: 'image/png',
						sizes: '96x96',
						href: '/favicon-96x96.png',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'apple-touch-icon',
						sizes: '180x180',
						href: '/apple-touch-icon.png',
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'manifest',
						href: '/site.webmanifest',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://drizzle-cube.com/drizzle-og.png',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:width',
						content: '1200',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:height',
						content: '630',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'twitter:image',
						content: 'https://drizzle-cube.com/drizzle-og.png',
					},
				},
				{
					tag: 'script',
					attrs: {
						async: true,
						src: 'https://scripts.simpleanalyticscdn.com/latest.js',
					},
				},
			],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/cliftonc/drizzle-cube' },
			],
			components: {
				SocialIcons: './src/components/SocialIcons.astro',
			},
			logo: {
				src: './src/assets/drizzle-cube.png',
				replacesTitle: false,
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
						{ label: 'How It Works', slug: 'getting-started/how-it-works' },
						{ label: 'AI Query Generation', slug: 'getting-started/ai-query-generation' },
						{ label: 'Scaling Your SaaS', slug: 'getting-started/scaling' },
					],
				},
				{
					label: 'Semantic Layer',
					items: [
						{ label: 'Overview', slug: 'semantic-layer' },
						{ label: 'Cubes', slug: 'semantic-layer/cubes' },
						{ label: 'Dimensions', slug: 'semantic-layer/dimensions' },
						{ label: 'Time Dimensions', slug: 'semantic-layer/time-dimensions' },
						{ label: 'Measures', slug: 'semantic-layer/measures' },
						{ label: 'Joins', slug: 'semantic-layer/joins' },
						{ label: 'Security', slug: 'semantic-layer/security' },
					],
				},
				{
					label: 'Client Components',
					items: [
						{ label: 'React Client', slug: 'client' },
						{ label: 'Query Builder', slug: 'client/query-builder' },
						{ label: 'Charts', slug: 'client/charts' },
						{ label: 'Dashboards', slug: 'client/dashboards' },
						{ label: 'Hooks', slug: 'client/hooks' },
					],
				},
				{
					label: 'Adapters',
					items: [
						{ label: 'Overview', slug: 'adapters' },
						{ label: 'Express', slug: 'adapters/express' },
						{ label: 'Fastify', slug: 'adapters/fastify' },
						{ label: 'Hono', slug: 'adapters/hono' },
						{ label: 'Next.js', slug: 'adapters/nextjs' },
						{ label: 'Custom Adapters', slug: 'adapters/custom' },
					],
				},
				{
					label: 'Examples',
					items: [
						{ label: 'Overview', slug: 'examples' },
						{ label: 'Express', slug: 'examples/express' },
						{ label: 'Fastify', slug: 'examples/fastify' },
						{ label: 'Hono', slug: 'examples/hono' },
						{ label: 'Next.js', slug: 'examples/nextjs' },
					],
				},
				{
					label: 'Advanced',
					items: [
						{ label: 'Performance', slug: 'advanced/performance' },
						{ label: 'Bundle Optimization', slug: 'advanced/bundle-optimization' },
						{ label: 'Troubleshooting', slug: 'advanced/troubleshooting' },
						{ label: 'TypeScript', slug: 'advanced/typescript' },
					],
				},
				{
					label: 'Contributing',
					items: [
						{ label: 'Helping with the project', slug: 'contributing/helping' },
						{ label: 'Guidelines', slug: 'contributing/guidelines' },
					],
				},
			],
			customCss: [
				'./src/styles/custom.css',
			],
		}),
	],
});
