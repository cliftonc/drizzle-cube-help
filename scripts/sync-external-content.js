#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the configuration file
const configPath = path.resolve(__dirname, '..', 'help-content-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Base directory for docs
const docsDir = path.resolve(__dirname, '..', 'src', 'content', 'docs');

console.log('Syncing external content...');

// Process each external include
for (const [slug, config_item] of Object.entries(config.externalIncludes)) {
  const sourcePath = path.resolve(__dirname, '..', config_item.source);
  const targetPath = path.join(docsDir, `${slug}.md`);
  
  try {
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Warning: Source file not found: ${sourcePath}`);
      continue;
    }
    
    // Read source content
    let content = fs.readFileSync(sourcePath, 'utf8');
    
    // Add frontmatter for Starlight
    const frontmatter = `---
title: ${config_item.title}
description: ${config_item.title} documentation
---

`;
    
    content = frontmatter + content;
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Write to target
    fs.writeFileSync(targetPath, content);    
    
  } catch (error) {
    console.error(`  ✗ Error syncing ${slug}:`, error.message);
  }
}

// Sync coverage report from drizzle-cube
const coverageSource = path.resolve(__dirname, '..', '..', 'drizzle-cube', 'coverage');
const coverageTarget = path.resolve(__dirname, '..', 'public', 'coverage');

if (fs.existsSync(coverageSource)) {
  console.log('Syncing coverage report...');

  // Remove existing coverage directory
  if (fs.existsSync(coverageTarget)) {
    fs.rmSync(coverageTarget, { recursive: true });
  }

  // Copy entire coverage directory
  fs.cpSync(coverageSource, coverageTarget, { recursive: true });

  // Remove the Istanbul-generated index.html to avoid overwriting the Starlight coverage page
  // The custom dashboard is at dashboard.html which the Starlight page iframes
  const istanbulIndex = path.join(coverageTarget, 'index.html');
  if (fs.existsSync(istanbulIndex)) {
    fs.rmSync(istanbulIndex);
    console.log('  ✓ Removed Istanbul index.html (using dashboard.html instead)');
  }

  console.log('  ✓ Coverage report synced to public/coverage/');
} else {
  console.log('  ⚠ Coverage folder not found at', coverageSource);
}

console.log('External content sync complete!');