import { execSync } from 'child_process';

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

try {
  console.log(`Bumping version (${bumpType})...`);
  execSync(`node scripts/bump-version.mjs ${bumpType}`, { stdio: 'inherit' });

  console.log("Generating version metadata...");
  execSync('npm run version:generate', { stdio: 'inherit' });
} catch (error) {
  console.error("Failed to bump version or generate metadata.");
  process.exit(1);
}

try {
  console.log("Running npm run build...");
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error("Build failed. Fix the build before committing.");
  process.exit(1);
}

try {
  const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
  if (!status) {
    console.log("No changes to commit.");
    process.exit(0);
  }

  console.log("Staging changes...");
  execSync('git add .', { stdio: 'inherit' });

  console.log(`Creating local commit with message: "${message}"`);
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

  console.log("---------------------------------------------------------");
  console.log("Local commit created. Not pushed.");
  console.log("---------------------------------------------------------");
} catch (error) {
  console.error("Error creating local commit:", error.message);
  process.exit(1);
}
