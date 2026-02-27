#!/usr/bin/env node

/**
 * Instagram Profile Analyzer - Multi-Profile Intelligence Extraction
 * Analyzes Instagram profiles for strategic business insights
 *
 * Profiles:
 * 1. dra.vanessasoares.bh - Health/Medical professional
 * 2. humbertoandradebr - Business/Entrepreneurship
 * 3. _fourcred - Finance/Business
 * 4. estetica_gabrielleoliveira - Beauty/Aesthetics
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '/Users/ericsantos/meu-aios/.env' });

const OUTPUT_DIR = '/Users/ericsantos/meu-aios/data/instagram-analysis';
const PROFILES = [
  {
    username: 'dra.vanessasoares.bh',
    url: 'https://www.instagram.com/dra.vanessasoares.bh/',
    expectedCategory: 'Healthcare/Medical',
  },
  {
    username: 'humbertoandradebr',
    url: 'https://www.instagram.com/humbertoandradebr/',
    expectedCategory: 'Business/Entrepreneurship',
  },
  {
    username: '_fourcred',
    url: 'https://www.instagram.com/_fourcred/',
    expectedCategory: 'Finance/Credit',
  },
  {
    username: 'estetica_gabrielleoliveira',
    url: 'https://www.instagram.com/estetica_gabrielleoliveira/',
    expectedCategory: 'Beauty/Aesthetics',
  },
];

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  data: (msg) => console.log(`${colors.magenta}◆${colors.reset} ${msg}`),
};

/**
 * Fetch Instagram profile data using shared data endpoint
 * Instagram exposes JSON data in window.__data variable
 */
async function fetchInstagramProfile(username) {
  return new Promise((resolve) => {
    log.step(`Fetching data for @${username}...`);

    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            log.success(`Successfully fetched data for @${username}`);
            resolve({
              username,
              success: true,
              data: json,
              statusCode: res.statusCode,
            });
          } else if (res.statusCode === 404) {
            log.warn(`Profile @${username} not found (404)`);
            resolve({
              username,
              success: false,
              error: 'Profile not found',
              statusCode: 404,
            });
          } else {
            log.warn(`Unexpected status ${res.statusCode} for @${username}`);
            resolve({
              username,
              success: false,
              error: `HTTP ${res.statusCode}`,
              statusCode: res.statusCode,
            });
          }
        } catch (e) {
          log.warn(`Failed to parse response for @${username}: ${e.message}`);
          // Try alternative parsing for HTML-embedded JSON
          const jsonMatch = data.match(/<script type="application\/json"[^>]*>([^<]+)<\/script>/);
          if (jsonMatch) {
            try {
              const json = JSON.parse(jsonMatch[1]);
              log.success(`Successfully extracted JSON from HTML for @${username}`);
              resolve({
                username,
                success: true,
                data: json,
                source: 'html-embedded',
              });
            } catch (e2) {
              log.error(`Failed to parse HTML JSON: ${e2.message}`);
              resolve({
                username,
                success: false,
                error: `Parse error: ${e.message}`,
              });
            }
          } else {
            resolve({
              username,
              success: false,
              error: `Parse error: ${e.message}`,
            });
          }
        }
      });
    }).on('error', (error) => {
      log.error(`Network error for @${username}: ${error.message}`);
      resolve({
        username,
        success: false,
        error: error.message,
      });
    });
  });
}

/**
 * Extract key insights from profile data
 */
function extractProfileInsights(profileData, expectedCategory) {
  const insights = {
    username: profileData.username,
    category: expectedCategory,
    timestamp: new Date().toISOString(),
    data: {
      bio: 'Data retrieval requires Instagram API or Apify Actor',
      followers: 'Unable to extract directly from public endpoint',
      following: 'Unable to extract directly from public endpoint',
      posts: 'Unable to extract directly from public endpoint',
      website: null,
      engagement: 'Unable to calculate without post data',
      content_themes: [],
      audience_analysis: {
        estimated_location: 'Brazil (from username patterns)',
        estimated_industry: expectedCategory,
        engagement_rate: null,
      },
    },
    status: profileData.success ? 'partial' : 'failed',
    notes: [],
  };

  if (!profileData.success) {
    insights.notes.push(`Error: ${profileData.error}`);
    insights.error = profileData.error;
  }

  return insights;
}

/**
 * Generate strategic recommendations based on profile category
 */
function generateRecommendations(profile) {
  const recommendations = {
    'Healthcare/Medical': [
      'Focus on educational content about health topics',
      'Build trust through certifications and credentials',
      'Engage with health-conscious audiences',
      'Create content addressing common health concerns',
      'Collaborate with other health professionals',
    ],
    'Business/Entrepreneurship': [
      'Share business insights and case studies',
      'Create motivational content for entrepreneurs',
      'Provide actionable business tips',
      'Build community among business leaders',
      'Offer networking opportunities',
    ],
    'Finance/Credit': [
      'Provide financial education content',
      'Create guides on credit management',
      'Share market insights and analysis',
      'Build credibility through expert knowledge',
      'Engage with finance-conscious audience',
    ],
    'Beauty/Aesthetics': [
      'Showcase before/after transformations',
      'Create tutorial and how-to content',
      'Build community around beauty standards',
      'Collaborate with beauty influencers',
      'Provide aesthetic consultation tips',
    ],
  };

  return recommendations[profile.category] || [
    'Create consistent, high-quality content',
    'Engage regularly with followers',
    'Collaborate with complementary accounts',
  ];
}

/**
 * Generate comprehensive markdown report
 */
function generateMarkdownReport(profilesData) {
  let markdown = '# Instagram Profiles - Strategic Intelligence Report\n\n';
  markdown += `**Generated:** ${new Date().toLocaleString('pt-BR')}\n`;
  markdown += `**Analysis Scope:** 4 Instagram Profiles for Strategic Business Intelligence\n\n`;

  markdown += '---\n\n';

  // Executive Summary
  markdown += '## Executive Summary\n\n';
  markdown += 'This report analyzes 4 strategic Instagram profiles across different industries in Brazil:\n\n';
  markdown += `1. **Healthcare**: Dra. Vanessa Soares (Medical Professional)\n`;
  markdown += `2. **Business**: Humberto Andrade (Entrepreneurship)\n`;
  markdown += `3. **Finance**: FourCred (Credit & Finance)\n`;
  markdown += `4. **Beauty**: Estética Gabrielle Oliveira (Aesthetics)\n\n`;

  markdown += '### Data Collection Method\n\n';
  markdown += 'To obtain complete and accurate data for these profiles, the recommended approach is:\n\n';
  markdown += '**Option 1: Apify Actor (Recommended)**\n';
  markdown += '- Use `Instagram Profile Scraper` Actor from Apify Store\n';
  markdown += '- Extracts: Bio, followers count, following count, post count, website link, recent posts\n';
  markdown += '- Setup: Requires `APIFY_API_TOKEN` in `.env`\n';
  markdown += '- Cost: ~$0.10-0.50 per profile depending on Actor selection\n\n';

  markdown += '**Option 2: Instagram Graph API (Official)**\n';
  markdown += '- Requires Instagram Business Account\n';
  markdown += '- Provides official metrics and insights\n';
  markdown += '- Setup: Facebook App + API Token\n\n';

  markdown += '**Option 3: Browser Automation**\n';
  markdown += '- Use Playwright with authentication\n';
  markdown += '- Scrapes all publicly visible data\n';
  markdown += '- Less reliable due to Instagram bot detection\n\n';

  markdown += '---\n\n';

  // Profile Details
  markdown += '## Individual Profile Analysis\n\n';

  profilesData.forEach((profile, index) => {
    markdown += `### ${index + 1}. ${profile.username}\n\n`;
    markdown += `**Category:** ${profile.data.category}\n`;
    markdown += `**Status:** ${profile.data.status}\n\n`;

    markdown += '#### Profile Information\n\n';
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Username | @${profile.username} |\n`;
    markdown += `| URL | https://instagram.com/${profile.username}/ |\n`;
    markdown += `| Bio | ${profile.data.bio} |\n`;
    markdown += `| Followers | ${profile.data.followers} |\n`;
    markdown += `| Following | ${profile.data.following} |\n`;
    markdown += `| Posts | ${profile.data.posts} |\n`;
    markdown += `| Website | ${profile.data.website || 'Not available'} |\n\n`;

    markdown += '#### Estimated Audience Analysis\n\n';
    markdown += `- **Primary Location:** ${profile.data.audience_analysis.estimated_location}\n`;
    markdown += `- **Industry Focus:** ${profile.data.audience_analysis.estimated_industry}\n`;
    markdown += `- **Engagement Rate:** ${profile.data.audience_analysis.engagement_rate || 'Requires post-level data'}\n\n`;

    markdown += '#### Strategic Recommendations\n\n';
    const recommendations = generateRecommendations(profile.data);
    recommendations.forEach((rec, idx) => {
      markdown += `${idx + 1}. ${rec}\n`;
    });

    markdown += '\n---\n\n';
  });

  // Comparative Analysis
  markdown += '## Comparative Analysis\n\n';

  markdown += '### Industry Breakdown\n\n';
  markdown += '| Profile | Industry | Primary Focus |\n';
  markdown += '|---------|----------|---------------|\n';
  profilesData.forEach((profile) => {
    markdown += `| @${profile.username} | ${profile.data.category} | Professional Services |\n`;
  });

  markdown += '\n### Cross-Profile Insights\n\n';
  markdown += '#### Content Strategy Patterns\n\n';
  markdown += '**Healthcare Profile (Dra. Vanessa Soares)**\n';
  markdown += '- Expected focus: Medical expertise, health education, patient testimonials\n';
  markdown += '- Target audience: Health-conscious individuals seeking professional medical guidance\n';
  markdown += '- Content opportunity: Educational posts, before/after cases, health tips\n\n';

  markdown += '**Business Profile (Humberto Andrade)**\n';
  markdown += '- Expected focus: Entrepreneurial insights, business strategies, success stories\n';
  markdown += '- Target audience: Entrepreneurs and business professionals\n';
  markdown += '- Content opportunity: Case studies, business lessons, networking\n\n';

  markdown += '**Finance Profile (FourCred)**\n';
  markdown += '- Expected focus: Credit solutions, financial products, market insights\n';
  markdown += '- Target audience: Business owners and credit-seeking entrepreneurs\n';
  markdown += '- Content opportunity: Product education, market analysis, credit tips\n\n';

  markdown += '**Beauty Profile (Estética Gabrielle Oliveira)**\n';
  markdown += '- Expected focus: Aesthetic transformations, beauty treatments, wellness\n';
  markdown += '- Target audience: Beauty and wellness-conscious individuals\n';
  markdown += '- Content opportunity: Tutorials, transformations, product showcases\n\n';

  // Implementation Guide
  markdown += '---\n\n';
  markdown += '## Implementation Guide - Complete Data Extraction\n\n';

  markdown += '### Step 1: Setup Apify (Recommended)\n\n';
  markdown += '```bash\n';
  markdown += '# Get Apify Token from https://console.apify.com\n';
  markdown += '# Add to .env file\n';
  markdown += 'echo "APIFY_API_TOKEN=your_token_here" >> .env\n';
  markdown += '```\n\n';

  markdown += '### Step 2: Create Apify Runner Script\n\n';
  markdown += '```javascript\n';
  markdown += 'const Apify = require("apify-client");\n';
  markdown += 'const client = new Apify.ApifyClient({token: process.env.APIFY_API_TOKEN});\n';
  markdown += '\n';
  markdown += 'async function scrapeProfile(url) {\n';
  markdown += '  const run = await client.actor("YOUR_ACTOR_ID").call({\n';
  markdown += '    profiles: [url],\n';
  markdown += '    resultsType: "posts",\n';
  markdown += '    includeDetails: true,\n';
  markdown += '  });\n';
  markdown += '\n';
  markdown += '  const result = await client.dataset(run.defaultDatasetId).listItems();\n';
  markdown += '  return result;\n';
  markdown += '}\n';
  markdown += '```\n\n';

  markdown += '### Step 3: Execute for Each Profile\n\n';
  markdown += '```bash\n';
  markdown += 'npm run instagram:analyze -- --profiles all --output report.md\n';
  markdown += '```\n\n';

  // Technical Notes
  markdown += '---\n\n';
  markdown += '## Technical Notes\n\n';

  markdown += '### Data Availability\n\n';
  markdown += '- **Public Data:** Bio, follower count, post count are publicly available\n';
  markdown += '- **Semi-Public Data:** Post content, comments, likes (requires scraping)\n';
  markdown += '- **Private Data:** DMs, email, phone (not accessible)\n\n';

  markdown += '### Collection Methods Comparison\n\n';
  markdown += '| Method | Cost | Speed | Reliability | Setup |\n';
  markdown += '|--------|------|-------|-------------|-------|\n';
  markdown += '| Apify | Low ($0.1-0.5) | Fast | Very High | Easy |\n';
  markdown += '| Graph API | Free | Medium | High | Complex |\n';
  markdown += '| Browser Automation | Free | Slow | Medium | Medium |\n';
  markdown += '| Manual | None | Very Slow | Perfect | None |\n\n';

  markdown += '### Recommended Next Steps\n\n';
  markdown += '1. **Obtain Apify API Token** from https://console.apify.com\n';
  markdown += '2. **Select Instagram Actor** - Look for "Instagram Profile Scraper" with high ratings\n';
  markdown += '3. **Test with 1 Profile** - Validate data structure and accuracy\n';
  markdown += '4. **Batch Process** - Run all 4 profiles and compile results\n';
  markdown += '5. **Generate Report** - Compile findings into strategic document\n\n';

  markdown += '---\n\n';
  markdown += '## Appendix\n\n';

  markdown += '### Profile URLs\n\n';
  markdown += '```\n';
  PROFILES.forEach((p) => {
    markdown += `${p.username}: ${p.url}\n`;
  });
  markdown += '```\n\n';

  markdown += '### Category Definitions\n\n';
  markdown += '- **Healthcare/Medical:** Professional medical services and education\n';
  markdown += '- **Business/Entrepreneurship:** Business strategies and entrepreneurial content\n';
  markdown += '- **Finance/Credit:** Financial products and credit solutions\n';
  markdown += '- **Beauty/Aesthetics:** Beauty treatments and aesthetic services\n\n';

  markdown += '---\n\n';
  markdown += `*Report Generated by Instagram Profile Analyzer*\n`;
  markdown += `*Last Updated: ${new Date().toISOString()}\n`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  Instagram Profiles - Strategic Intelligence Analyzer${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      log.success(`Created output directory: ${OUTPUT_DIR}`);
    }

    log.step(`Analyzing ${PROFILES.length} Instagram profiles...`);
    log.info(`Profiles: ${PROFILES.map((p) => p.username).join(', ')}\n`);

    // Fetch all profiles
    const results = [];
    for (const profile of PROFILES) {
      const result = await fetchInstagramProfile(profile.username);
      const insights = extractProfileInsights(result, profile.expectedCategory);
      results.push(insights);

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    log.step(`Processing results...`);

    // Generate report
    const markdown = generateMarkdownReport(results);

    // Save report
    const reportPath = path.join(OUTPUT_DIR, 'instagram-profiles-report.md');
    fs.writeFileSync(reportPath, markdown, 'utf-8');
    log.success(`Report saved to: ${reportPath}`);

    // Save raw data
    const dataPath = path.join(OUTPUT_DIR, 'profiles-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(results, null, 2), 'utf-8');
    log.success(`Raw data saved to: ${dataPath}`);

    // Summary
    console.log(`\n${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}Analysis Complete${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════════════════${colors.reset}`);
    log.info(`Profiles Analyzed: ${results.length}`);
    log.info(`Successful: ${results.filter((r) => r.status === 'partial' || r.status === 'success').length}`);
    log.info(`Report Location: ${reportPath}`);
    console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
    console.log(`  1. Review the generated report at: ${reportPath}`);
    console.log(`  2. Get an Apify API Token from: https://console.apify.com`);
    console.log(`  3. Add token to .env: APIFY_API_TOKEN=your_token`);
    console.log(`  4. Use Apify to extract complete profile data and post metrics\n`);

  } catch (error) {
    log.error(`Analysis failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
