import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			// if you have a single-page app (SPA) with no server-side rendering, 
			// set 'fallback' to a file that will be served for any non-static routes
			fallback: 'index.html',
			pages: 'docs',
			assets: 'docs',
			// other adapter-static options...
		  }),
	},

	// Override http methods in the prerendering configuration
	prerender: {
		default: false
	}
};

export default config;
