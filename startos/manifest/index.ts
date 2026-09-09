import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'kimai',
  title: 'Kimai',
  license: 'AGPL-3.0-or-later',
  packageRepo: 'https://github.com/Start9-Community/kimai-startos',
  upstreamRepo: 'https://github.com/kimai/kimai',
  marketingUrl: 'https://www.kimai.org/',
  donationUrl: 'https://www.kimai.org/support.html',
  description: { short, long },
  // 'main'    — Kimai's /opt/kimai/var (invoices, exports, templates, plugins)
  // 'mysql'   — the MySQL data directory
  // 'startos' — store.json (generated secrets + SMTP settings)
  volumes: ['main', 'mysql', 'startos'],
  images: {
    // `2.66.0` is the Apache flavour: it shares a digest with the `apache`,
    // `stable` and `2` tags, while `latest`/`fpm` point at the PHP-FPM build,
    // which has no web server and would need an nginx sidecar.
    kimai: {
      source: { dockerTag: 'kimai/kimai2:2.66.0' },
      arch: ['x86_64', 'aarch64'],
    },
    mysql: {
      source: { dockerTag: 'mysql:8.4.11' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})
