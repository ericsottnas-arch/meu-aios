# Implementation Guide: Instagram Profile Data Extraction with Apify

Complete step-by-step guide to extract structured data from all 4 Instagram profiles using Apify.

---

## Prerequisites

### Required Accounts
- [ ] Apify account (free at apify.com)
- [ ] Node.js 14+ installed
- [ ] npm or yarn package manager

### Environment Setup

1. **Create `.env` file** in project root:
```bash
APIFY_API_TOKEN=your_token_here
```

2. **Install dependencies**:
```bash
npm install apify-client dotenv
```

---

## Step 1: Get Apify Token

### 1.1 Create Apify Account
1. Go to https://console.apify.com
2. Sign up (free tier available)
3. Verify email address

### 1.2 Generate API Token
1. Navigate to **Settings** (user profile menu)
2. Click **API Tokens**
3. Click **Create Token**
4. Copy the token
5. Save to `.env` as `APIFY_API_TOKEN=your_token_here`

### 1.3 Verify Credentials
```bash
# Test token in terminal
echo $APIFY_API_TOKEN  # Should show your token
```

---

## Step 2: Find & Test Instagram Actor

### 2.1 Browse Apify Store
1. Go to https://apify.com/store
2. Search for "Instagram"
3. Look for these actors:

**Top Recommended:**
1. **Instagram Profile Scraper**
   - Extracts: Bio, followers, following, posts, engagement
   - Author: @berniecook
   - Rating: 4.8/5 stars

2. **Instagram Post Scraper**
   - Extracts: Post details, comments, engagement
   - Author: @apify
   - Rating: 4.7/5 stars

### 2.2 Get Actor ID
Each actor has a unique ID:
- Look at the URL: `https://apify.com/store/actor_name?id=ACTOR_ID`
- Or in the actor page, find the "ID" field
- Example: `berniecook/instagram-profile-scraper`

### 2.3 Test with One Profile
```bash
# Create test script
cat > test-apify.js << 'EOF'
require('dotenv').config();
const Apify = require('apify-client');

const client = new Apify.ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function testActor() {
  try {
    console.log('Testing Apify connection...');

    // Try Instagram Profile Scraper
    const run = await client.actor('berniecook/instagram-profile-scraper').call({
      profiles: ['dra.vanessasoares.bh'],
      maxPostsPerProfile: 10
    });

    const dataset = await client.dataset(run.defaultDatasetId).listItems();
    console.log('Success! Found data:');
    console.log(JSON.stringify(dataset, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testActor();
EOF

# Run test
node test-apify.js
```

---

## Step 3: Create Main Extraction Script

### 3.1 Full Extraction Script

```javascript
// scripts/extract-instagram-profiles.js

require('dotenv').config();
const Apify = require('apify-client');
const fs = require('fs');
const path = require('path');

const ACTOR_ID = 'berniecook/instagram-profile-scraper'; // or your chosen actor
const OUTPUT_DIR = 'data/instagram-analysis';

const PROFILES = [
  'dra.vanessasoares.bh',
  'humbertoandradebr',
  '_fourcred',
  'estetica_gabrielleoliveira'
];

const client = new Apify.ApifyClient({
  token: process.env.APIFY_API_TOKEN
});

async function extractProfile(username) {
  console.log(`\n>>> Extracting @${username}...`);

  try {
    const run = await client.actor(ACTOR_ID).call({
      profiles: [username],
      maxPostsPerProfile: 30,
      resultsType: 'posts'
    });

    const dataset = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`✓ Found ${dataset.items.length} posts`);

    return {
      username,
      success: true,
      postCount: dataset.items.length,
      data: dataset.items,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`✗ Error extracting @${username}:`, error.message);
    return {
      username,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Instagram Profile Extractor - Apify Integration');
  console.log('='.repeat(60));

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = [];

  // Extract each profile
  for (const username of PROFILES) {
    const result = await extractProfile(username);
    results.push(result);

    // Delay between requests (be nice to the API)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results
  const outputPath = path.join(OUTPUT_DIR, 'extracted-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('EXTRACTION SUMMARY');
  console.log('='.repeat(60));

  results.forEach(r => {
    if (r.success) {
      console.log(`✓ @${r.username}: ${r.postCount} posts extracted`);
    } else {
      console.log(`✗ @${r.username}: ${r.error}`);
    }
  });

  console.log(`\nResults saved to: ${outputPath}`);
}

main();
```

### 3.2 Run Extraction
```bash
# Install apify-client if not already installed
npm install apify-client dotenv

# Run extraction
node scripts/extract-instagram-profiles.js
```

---

## Step 4: Process & Analyze Data

### 4.1 Analysis Script

```javascript
// scripts/analyze-instagram-data.js

const fs = require('fs');
const path = require('path');

const DATA_FILE = 'data/instagram-analysis/extracted-data.json';

function analyzeProfile(profileData) {
  if (!profileData.success) {
    return null;
  }

  const posts = profileData.data || [];

  // Calculate metrics
  const totalLikes = posts.reduce((sum, post) => sum + (post.likeCount || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.commentCount || 0), 0);
  const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
  const avgComments = posts.length > 0 ? totalComments / posts.length : 0;

  // Find best performing posts
  const topPosts = posts
    .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
    .slice(0, 5);

  // Analyze content types
  const contentTypes = {};
  posts.forEach(post => {
    const type = post.type || 'unknown';
    contentTypes[type] = (contentTypes[type] || 0) + 1;
  });

  return {
    username: profileData.username,
    totalPosts: posts.length,
    metrics: {
      totalLikes,
      totalComments,
      avgLikes: avgLikes.toFixed(2),
      avgComments: avgComments.toFixed(2),
      engagement: ((avgLikes + avgComments) * 100).toFixed(2) + '%'
    },
    contentTypes,
    topPosts: topPosts.map(p => ({
      caption: p.caption ? p.caption.substring(0, 50) + '...' : 'No caption',
      likes: p.likeCount,
      comments: p.commentCount,
      posted: p.timestamp
    }))
  };
}

function main() {
  const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const analysis = rawData.map(analyzeProfile).filter(Boolean);

  // Create markdown report
  let markdown = '# Instagram Profile Analysis Results\n\n';
  markdown += `Generated: ${new Date().toLocaleString()}\n\n`;

  analysis.forEach(profile => {
    markdown += `## @${profile.username}\n\n`;
    markdown += `**Posts Analyzed:** ${profile.totalPosts}\n\n`;

    markdown += `### Engagement Metrics\n`;
    markdown += `- Total Likes: ${profile.metrics.totalLikes.toLocaleString()}\n`;
    markdown += `- Total Comments: ${profile.metrics.totalComments.toLocaleString()}\n`;
    markdown += `- Avg Likes/Post: ${profile.metrics.avgLikes}\n`;
    markdown += `- Avg Comments/Post: ${profile.metrics.avgComments}\n`;
    markdown += `- Engagement Rate: ${profile.metrics.engagement}\n\n`;

    markdown += `### Content Types\n`;
    Object.entries(profile.contentTypes).forEach(([type, count]) => {
      markdown += `- ${type}: ${count} posts (${((count/profile.totalPosts)*100).toFixed(1)}%)\n`;
    });

    markdown += `\n### Top 5 Performing Posts\n`;
    profile.topPosts.forEach((post, idx) => {
      markdown += `${idx + 1}. "${post.caption}" - ${post.likes} likes, ${post.comments} comments\n`;
    });

    markdown += '\n---\n\n';
  });

  // Save analysis
  const outputPath = 'data/instagram-analysis/analysis-results.md';
  fs.writeFileSync(outputPath, markdown);
  console.log(`Analysis saved to: ${outputPath}`);
}

main();
```

### 4.2 Run Analysis
```bash
node scripts/analyze-instagram-data.js
```

---

## Step 5: Generate Strategic Report

### 5.1 Create Comparison Report

```javascript
// scripts/generate-comparison-report.js

const fs = require('fs');

const DATA_FILE = 'data/instagram-analysis/extracted-data.json';

function generateComparison() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  let markdown = '# Comparative Analysis Report\n\n';
  markdown += '## Profile Performance Comparison\n\n';

  // Create comparison table
  markdown += '| Profile | Posts | Total Likes | Avg Likes | Total Comments | Avg Comments |\n';
  markdown += '|---------|-------|-------------|-----------|-----------------|--------|\n';

  data.forEach(profile => {
    if (!profile.success) return;

    const posts = profile.data || [];
    const totalLikes = posts.reduce((s, p) => s + (p.likeCount || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.commentCount || 0), 0);
    const avgLikes = (totalLikes / posts.length).toFixed(0);
    const avgComments = (totalComments / posts.length).toFixed(0);

    markdown += `| @${profile.username} | ${posts.length} | ${totalLikes.toLocaleString()} | ${avgLikes} | ${totalComments.toLocaleString()} | ${avgComments} |\n`;
  });

  markdown += '\n## Strategic Insights\n\n';
  markdown += '### Top Performer: ___\n';
  markdown += '### Fastest Growing: ___\n';
  markdown += '### Best Engagement: ___\n';
  markdown += '### Content Opportunity: ___\n\n';

  markdown += '## Recommendations\n\n';
  markdown += '1. Focus on high-engagement content types\n';
  markdown += '2. Post at optimal times for each audience\n';
  markdown += '3. Leverage successful content themes\n';
  markdown += '4. Cross-promote between complementary profiles\n';

  fs.writeFileSync('data/instagram-analysis/comparison-report.md', markdown);
  console.log('Comparison report generated');
}

generateComparison();
```

---

## Step 6: Automate Recurring Extractions

### 6.1 Create Scheduler

```javascript
// scripts/schedule-extractions.js

const schedule = require('node-schedule');
const { exec } = require('child_process');

// Run extraction every Monday at 9 AM
schedule.scheduleJob('0 9 * * 1', () => {
  console.log('Running scheduled Instagram extraction...');
  exec('node scripts/extract-instagram-profiles.js', (error, stdout, stderr) => {
    if (error) {
      console.error('Extraction failed:', error);
      return;
    }
    console.log('Extraction completed:', stdout);
  });
});

console.log('Scheduler started. Running extractions every Monday at 9 AM');
```

### 6.2 Setup Cron Job (Optional)

```bash
# Edit crontab
crontab -e

# Add this line (runs extraction every Monday at 9 AM)
0 9 * * 1 cd /path/to/project && node scripts/extract-instagram-profiles.js >> logs/extraction.log 2>&1
```

---

## Step 7: Troubleshooting

### Common Issues

**Issue: "Invalid API token"**
```
Solution:
1. Verify token in Apify console
2. Check .env file format
3. Restart terminal/IDE
4. Regenerate new token if needed
```

**Issue: "Actor not found"**
```
Solution:
1. Verify actor ID is correct
2. Check actor still exists on Apify
3. Try different actor from store
4. Check actor supports Instagram
```

**Issue: "Rate limit exceeded"**
```
Solution:
1. Add delays between requests: await delay(3000)
2. Reduce maxPostsPerProfile setting
3. Use batch processing with delays
4. Check Apify billing/quota
```

**Issue: "No data returned"**
```
Solution:
1. Verify username is correct (no @ symbol)
2. Check profile is public
3. Verify actor supports that data type
4. Try with fewer maxPostsPerProfile
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=apify-client:* node scripts/extract-instagram-profiles.js
```

---

## Step 8: Export & Share Results

### 8.1 Export to Different Formats

```javascript
// Export to CSV
const json2csv = require('json2csv').parse;
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/instagram-analysis/extracted-data.json'));

const csv = json2csv(data);
fs.writeFileSync('data/instagram-analysis/profiles.csv', csv);
```

### 8.2 Create Dashboard

Recommended tools:
- **Google Sheets** - Share analysis results
- **Tableau** - Create interactive dashboards
- **Data Studio** - Free Google visualization tool
- **Metabase** - Self-hosted BI tool

---

## Step 9: Monthly Review Process

### Monthly Checklist

- [ ] Run extraction script
- [ ] Compare to previous month
- [ ] Identify top performing content
- [ ] Note any growth/decline
- [ ] Update strategic recommendations
- [ ] Share insights with teams

### Key Metrics to Track

1. **Growth**
   - Follower increase
   - Post frequency
   - Content consistency

2. **Engagement**
   - Likes per post trend
   - Comments per post trend
   - Overall engagement rate

3. **Content Performance**
   - Top 5 best posts
   - Content types that work
   - Optimal posting times

4. **Business Impact**
   - Website clicks from bio
   - DM/inquiry volume
   - Conversion to customers

---

## Cost Breakdown

### Apify Pricing

| Tier | Monthly Spend | Execution Units | Use Case |
|------|---------------|-----------------|----------|
| Free | $0 | 100 units | Testing, 1-2 profiles/month |
| Personal | $10-30 | 500-2,000 units | Occasional extractions |
| Business | $50-200 | 5,000-20,000 units | Regular multi-profile tracking |

**Cost Example:** Extracting 4 profiles with 50 posts each = ~100-200 units = $0.50-$2 per month

---

## Next Steps

1. **Complete:** Get Apify token
2. **Complete:** Choose Instagram actor
3. **Complete:** Run test extraction
4. **Complete:** Process and analyze data
5. **Complete:** Generate comparison report
6. **Complete:** Set up monthly automation
7. **Continue:** Monitor metrics and optimize

---

## Support & Resources

- **Apify Documentation:** https://docs.apify.com
- **Apify Community:** https://discord.gg/apify
- **Actor Documentation:** Check actor page for full input schema
- **Node.js SDK:** https://github.com/apify/apify-client-js

---

**Implementation Status:** Ready to Execute
**Last Updated:** February 24, 2026
**Next Review:** April 30, 2026
