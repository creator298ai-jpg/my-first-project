// Regenerate PNG icons from scripts/icon.svg: `npx -y -p sharp node scripts/make-icons.cjs`
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const sizes = [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]];

(async () => {
  for (const [name, size] of sizes) {
    await sharp(path.join(root, 'scripts/icon.svg'))
      .resize(size, size)
      .flatten({ background: '#23234f' })
      .png()
      .toFile(path.join(root, 'public/icons', `${name}.png`));
  }
  console.log('icons ok');
})();
