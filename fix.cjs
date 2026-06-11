const fs = require('fs');

function fixAuthPanel() {
  let c = fs.readFileSync('src/features/AuthPanel.tsx', 'utf8');
  // Match the broken class string that ends with a backslash and newline, e.g.:
  // className=" min-h-11... focus:outline-none\
  const badRegex = /className=" min-h-11.*focus:outline-none\\(\r?\n)/g;
  c = c.replace(badRegex, 'className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-primary placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"$1');
  fs.writeFileSync('src/features/AuthPanel.tsx', c);
}

fixAuthPanel();
