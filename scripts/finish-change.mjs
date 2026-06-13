import { execSync } from 'child_process';
import fs from 'fs';

const bumpType = process.argv[2];
if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error("Usage: node scripts/finish-change.mjs <patch|minor|major> [commit message]");
  process.exit(1);
}

let message = process.argv.slice(3).join(' ').trim();
if (!message) {
  if (bumpType === 'patch') message = "fix: local patch update";
  else if (bumpType === 'minor') message = "feat: local feature update";
  else if (bumpType === 'major') message = "chore: local major update";
}

console.log("Checking for changes...");
try {
  const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
  if (!status) {
    console.log("No changes to finalize.");
    process.exit(0);
  }
} catch (error) {
  console.error("Error checking git status:", error.message);
  process.exit(1);
}

console.log("Running preflight build check...");
try {
  execSync('npm run build:check', { stdio: 'inherit' });
} catch (error) {
  console.error("Build check failed. Version was not bumped. No commit was created.");
  process.exit(1);
}

const snapshotFiles = ['package.json', 'package-lock.json', 'src/version.ts'];
const snapshots = {};
for (const file of snapshotFiles) {
  if (fs.existsSync(file)) {
    snapshots[file] = fs.readFileSync(file, 'utf8');
  }
}

try {
  console.log(`Bumping version (${bumpType})...`);
  execSync(`node scripts/bump-version.mjs ${bumpType}`, { stdio: 'inherit' });

  console.log("Generating version metadata...");
  execSync('npm run version:generate', { stdio: 'inherit' });
} catch (error) {
  console.error("Failed to bump version or generate metadata.");
  process.exit(1);
}

console.log("Running final build...");
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error("Final build failed after version bump. Version files were restored. No commit was created.");
  for (const file of snapshotFiles) {
    if (snapshots[file]) {
      fs.writeFileSync(file, snapshots[file]);
    } else if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
  process.exit(1);
}

try {
  console.log("Creating local commit...");
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`New version: v${pkg.version}`);
  console.log("---------------------------------------------------------");
  console.log("Local commit created. Not pushed.");
  console.log("---------------------------------------------------------");
} catch (error) {
  console.error("Error creating local commit:", error.message);
  // Restore files if commit fails
  for (const file of snapshotFiles) {
    if (snapshots[file]) {
      fs.writeFileSync(file, snapshots[file]);
    }
  }
  process.exit(1);
}
