// App-wide constants and environment-driven settings
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN || '.my-platform.34.144.221.251.nip.io';
const UPLOAD_BUCKET = process.env.UPLOAD_BUCKET || 'multi-tenant-blog-platform-files-cloud';

module.exports = { PLATFORM_DOMAIN, UPLOAD_BUCKET };
