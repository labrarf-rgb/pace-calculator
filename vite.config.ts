import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Pace is served from a sub-path on both origins it lives at:
 *   https://www.labrarf.com/pace-calculator/   (same-origin copy, the real one)
 *   https://labrarf-rgb.github.io/pace-calculator/
 * Naming the repo and the folder the same thing means one base works for both.
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
