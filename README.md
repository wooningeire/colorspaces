# Color space pipeline explorer
A node-based color management explorer.

## Building
This app builds to a static web page. It uses [Vite](https://vitejs.dev) for bundling and uses [pnpm](https://pnpm.io/installation)'s lockfile.

Initial setup:
`pnpm install --frozen-lockfile`

To build with absolute paths:
`pnpm run build`

To build with relative paths:
`pnpm run build.public`

To start a development server:
`pnpm run dev`
