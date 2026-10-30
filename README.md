# OWNDAYS standalone updates

The existing repository homepage is unchanged. This directory serves a harmless external-loading probe and the browser-local HKSP/lens counter.

Production entry: `/owndays/`. No ChatGPT or Vercel visitor sign-in is required. Office network access and OWNDAYS external-script policy still need testing on the actual store computer.

- `probe-v1.js`: handshake only; does not read customer or product data.
- `runtime.js`: latest standalone counter, executed in the already authenticated OWNDAYS tab. No credentials, sales records or results are uploaded to this host.
- `counter-loader.js`: stable bookmark loader. Fetches runtime anew when clicked.
- `src/`: editable TypeScript, catalog and exact legacy-name mappings. Never put credentials or customer records in these files.

For later updates, edit the relevant catalog/rules in `src/`, bump the online release string in `src/main.ts`, rebuild `runtime.js`, and commit the source and generated runtime together. Vercel automatically publishes the configured main branch. The bookmark loader and production URL stay fixed.

Build with esbuild (ES2020, bundle, IIFE, minified, ASCII) from `src/main.ts`. No third-party modules are loaded by visitors at runtime. This release retains the tested 1.6 R-only parser and classification behavior. Actual store counts still require manual comparison.
