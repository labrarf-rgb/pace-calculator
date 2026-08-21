import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Pace is served from a sub-path, not a domain root:
 *   https://www.labrarf.com/pace-calculator/   (the live app)
 * The repo, that folder, and this base all share one name, so the same build
 * would also drop straight into https://labrarf-rgb.github.io/pace-calculator/
 * if Pages were ever enabled on the source repo. It is not today.
 */
const BASE = '/pace-calculator/'

function commitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/** Writes the built commit to dist/version.json so a deploy can be verified. */
function stampVersion(sha: string) {
  return {
    name: 'stamp-version',
    closeBundle() {
      writeFileSync(
        'dist/version.json',
        JSON.stringify({ commit: sha, builtAt: new Date().toISOString() }, null, 2),
      )
    },
  }
}

export default defineConfig(({ command }) => {
  const isProd = command === 'build'
  const sha = commitSha()
  return {
    base: isProd ? BASE : '/',
    plugins: [react(), ...(isProd ? [stampVersion(sha)] : [])],
  }
})
