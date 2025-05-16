# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Set-up

1. Install the dependencies

   ```sh
   npm install or yarn
   ```

## Build and run for production

1. Generate a full static production build

   ```sh
   npm run build
   ```
## Load extension in chrome

1. Go to chrome://extensions/
2. Click "Load unpacked" and navigate to project directory
3. Select folder and run extension.

## RPC Keys Configuration

This extension comes pre-configured with  Solana RPC endpoints. Users can use the extension immediately without needing to provide their own RPCs.

### RPC Endpoint Configuration

- The extension uses multiple RPC endpoints 
- If an endpoint fails or hits rate limits, the system automatically switches to the next endpoint
- Request throttling is implemented to avoid rate limiting with a configurable delay

### Custom RPC Keys (Optional)

End users can optionally enter their own RPCs in the Settings menu if they want to:

1. Use their own account/quota with RPC providers
2. Avoid any rate limiting issues with the default keys
3. Customize the throttling delay between requests

## Development Setup

If you're developing this extension:

The default RPC endpoints are embedded in the built extension


## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
