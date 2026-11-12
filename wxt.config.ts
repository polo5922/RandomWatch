import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  // Zip des sources demandé par Mozilla : sans les visuels générés du store.
  zip: { excludeSources: ['store/out/**'] },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'tabs'],
    host_permissions: ['*://*.disneyplus.com/*', '*://*.paramountplus.com/*'],
    browser_specific_settings: {
      gecko: {
        id: 'randomwatch@local',
        // Exigé par addons.mozilla.org pour les nouvelles extensions : aucune donnée collectée.
        data_collection_permissions: { required: ['none'] },
      } as { id: string },
    },
  },
});
