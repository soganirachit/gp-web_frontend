const fs = require('fs');
const path = require('path');

// Tailwind loads config via jiti, which caches compiled files. On Windows the
// default %TEMP%\node-jiti folder can fail with ENOENT — keep cache in-project.
const jitiCacheDir = path.join(__dirname, '.cache', 'jiti');
fs.mkdirSync(jitiCacheDir, { recursive: true });
process.env.JITI_CACHE_DIR = jitiCacheDir;

const tailwindConfigPath = path.join(__dirname, 'tailwind.config.js');

module.exports = {
  plugins: {
    tailwindcss: { config: tailwindConfigPath },
    autoprefixer: {},
  },
};
