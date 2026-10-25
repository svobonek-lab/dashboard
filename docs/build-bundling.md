# Build a bundle report

The frontend uses Vite 8 with Rolldown. Run `npm run build` from the repository root to build the app and write `stats.html` in the repository root. The report includes a treemap plus gzip and Brotli sizes. It is ignored by Git and stays outside `dist`, because it contains local module paths.

Rolldown's `output.codeSplitting.groups` defines `react-vendor`, `ui-vendor`, and `charts-vendor` groups. A group appears in the output only when a matching dependency is used. This uses Vite 8's supported manual code splitting API. Vite 8 deprecates Rollup's function-form `output.manualChunks`, so the configuration uses Rolldown's replacement.

Currently, the app imports React, React DOM, and `lucide-react`. It does not depend on `react-router-dom`, `clsx`, `tailwind-merge`, or a charting library, so those match rules create no chunk until the dependency is actually added. Avoid adding a dependency to the app solely to populate a vendor group.

The report can be regenerated locally with each production build; do not commit or publish it. Bundle sizes vary with dependency versions and build environment, so compare reports from the same commit and toolchain when investigating regressions.
