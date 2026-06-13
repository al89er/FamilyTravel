import { execSync } from 'child_process';

let message = process.argv.slice(2).join(' ').trim();
if (!message) {
  message = "checkpoint: local working checkpoint";
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
  console.log("Local commit created. Not pushed. Run git push only when ready.");
  console.log("---------------------------------------------------------");
} catch (error) {
  console.error("Error creating local commit:", error.message);
  process.exit(1);
}
