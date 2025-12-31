#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '..', 'src', 'content', 'docs');

// Define titles for each file
const titles = {
  'getting-started/index': 'Getting Started with Drizzle Cube',
  'getting-started/quick-start': 'Quick Start Guide',
  'getting-started/how-it-works': 'How Drizzle Cube Works',
  'getting-started/ai-query-generation': 'AI Query Generation',
  'getting-started/scaling': 'Scaling Your SaaS',
  
  'semantic-layer/index': 'Semantic Layer Overview',
  'semantic-layer/cubes': 'Cubes',
  'semantic-layer/dimensions': 'Dimensions',
  'semantic-layer/time-dimensions': 'Time Dimensions',
  'semantic-layer/measures': 'Measures',
  'semantic-layer/joins': 'Joins',
  'semantic-layer/security': 'Security',
  
  'client/index': 'React Client Overview',
  'client/analysis-builder': 'Analysis Builder',
  'client/charts': 'Charts',
  'client/dashboards': 'Dashboards',
  'client/hooks': 'React Hooks',
  
  'adapters/index': 'Adapters Overview',
  'adapters/custom': 'Custom Adapters',
  
  'examples/index': 'Examples Overview',
  
  'advanced/performance': 'Performance Optimization',
  'advanced/bundle-optimization': 'Bundle Optimization',
  'advanced/troubleshooting': 'Troubleshooting',
  'advanced/typescript': 'TypeScript Usage',
  
  'contributing/helping': 'Contributing Guide',
};

function addFrontmatter(filePath, title) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if frontmatter already exists
  if (content.startsWith('---')) {
    console.log(`Skipping ${filePath} - already has frontmatter`);
    return;
  }
  
  const frontmatter = `---
title: ${title}
---

`;
  
  const newContent = frontmatter + content;
  fs.writeFileSync(filePath, newContent);
  console.log(`Added frontmatter to ${filePath}`);
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (item.endsWith('.md')) {
      // Get relative path for title lookup
      const relativePath = path.relative(docsDir, fullPath);
      const slug = relativePath.replace('.md', '');
      
      const title = titles[slug] || slug.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      addFrontmatter(fullPath, title);
    }
  }
}

console.log('Adding frontmatter to markdown files...');
processDirectory(docsDir);
console.log('Done!');