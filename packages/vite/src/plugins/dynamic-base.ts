import { createUnplugin } from 'unplugin'

interface DynamicBasePluginOptions {
  env: 'dev' | 'server' | 'client'
  devAppConfig?: Record<string, any>
  globalPublicPath?: string
}

export const DynamicBasePathPlugin = createUnplugin(function (options: DynamicBasePluginOptions) {
  return {
    name: 'nuxt:dynamic-base-path',
    resolveId (id) {
      if (id.startsWith('/__NUXT_BASE__')) {
        return id.replace('/__NUXT_BASE__', '')
      }
    },
    enforce: 'post',
    transform (code, id) {
      if (options.globalPublicPath && id.includes('entry.ts')) {
        code = 'import { joinURL } from "ufo";' +
          `${options.globalPublicPath} = joinURL(NUXT_BASE, NUXT_CONFIG.app.buildAssetsPath);` + code
      }

      if (code.includes('NUXT_BASE') && !code.includes('const NUXT_BASE =')) {
        code = 'const NUXT_BASE = NUXT_CONFIG.app.cdnURL || NUXT_CONFIG.app.basePath;' + code

        if (options.env === 'dev') {
          code = `const NUXT_CONFIG = { app: ${JSON.stringify(options.devAppConfig)} };` + code
        } else if (options.env === 'server') {
          code = 'import NUXT_CONFIG from "#config";' + code
        } else {
          code = 'const NUXT_CONFIG = __NUXT__.config;' + code
        }
      }

      // Sanitize imports
      code = code.replace(/from *['"]\/__NUXT_BASE__(\/[^'"]*)['"]/g, 'from "$1"')

      // Dynamically compute string URLs featuring basePath
      for (const delimiter of ['`', '"', "'"]) {
        const delimiterRE = new RegExp(`${delimiter}([^${delimiter}]*)\\/__NUXT_BASE__\\/([^${delimiter}]*)${delimiter}`, 'g')
        /* eslint-disable-next-line no-template-curly-in-string */
        code = code.replace(delimiterRE, '`$1${NUXT_BASE}$2`')
      }

      return code
    }
  }
})