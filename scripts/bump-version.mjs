import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgPath = path.join(__dirname, '..', 'package.json');

const bumpType = process.argv[2];
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error("Usage: node bump-version.mjs <major|minor|patch>");
  process.exit(1);
}

try {
  const pkgData = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgData);
  const oldVersion = pkg.version || "0.1.0";

  let [major, minor, patch] = oldVersion.split('.').map(Number);
  if (isNaN(major)) major = 0;
  if (isNaN(minor)) minor = 0;
  if (isNaN(patch)) patch = 0;

  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else if (bumpType === 'patch') {
    patch += 1;
  }

  const newVersion = `${major}.${minor}.${patch}`;
  pkg.version = newVersion;

  const endOfLine = pkgData.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2).replace(/\n/g, endOfLine) + endOfLine, 'utf-8');

  console.log(`Bumped version from ${oldVersion} to ${newVersion} (${bumpType})`);
} catch (e) {
  console.error("Error bumping version:", e.message);
  process.exit(1);
}
