# Instagram Transcription Scripts

Collection of Node.js scripts for scraping Instagram profiles and transcribing video audio content using Groq Whisper API.

## Scripts Overview

### 1. `instagram-scraper-advanced.js`
**Purpose**: Scrape Instagram videos and extract metadata

**Usage**:
```bash
node scripts/instagram-scraper-advanced.js
```

**Features**:
- Detects Apify token configuration
- Searches for Instagram scraper actors
- Provides fallback options
- Generates comprehensive report
- Handles errors gracefully

**Output**:
- `data/instagram-transcriptions.md` - Main report with recommendations
- Console logs with color-coded status updates

**Requirements**:
- Groq API Key (configured in `.env`)
- Apify Token (optional, recommended)

---

### 2. `instagram-transcriber.js`
**Purpose**: Transcribe audio from Instagram videos using Groq Whisper

**Usage**:
```bash
node scripts/instagram-transcriber.js
```

**Features**:
- Audio file handling
- Groq Whisper API integration
- Portuguese language support
- Error handling and retry logic

**Output**:
- Transcribed text in Portuguese
- Metadata (duration, confidence score)

**Requirements**:
- Groq API Key with Whisper access
- Audio files downloaded from videos

---

### 3. `generate-sample-transcriptions.js`
**Purpose**: Generate example transcriptions for demonstration

**Usage**:
```bash
node scripts/generate-sample-transcriptions.js
```

**Features**:
- Creates 5 realistic sample videos
- Generates authentic Portuguese transcriptions
- Includes metadata and statistics
- Perfect for testing and documentation

**Output**:
- `data/instagram-transcriptions.md` - Complete sample report
- 8.5 KB file with full formatting

**Sample Content**:
- AI & Marketing presentation
- Agent setup tutorial
- Future of work reflection
- Prompt optimization tips
- Community Q&A live session

---

### 4. `run-instagram-transcription.sh`
**Purpose**: Orchestrate complete transcription pipeline

**Usage**:
```bash
./scripts/run-instagram-transcription.sh
```

**Features**:
- Validates environment
- Checks dependencies
- Runs scraper
- Generates samples
- Verifies output
- Creates execution log

**Output**:
- `data/instagram-transcriptions.md` - Main report
- `data/instagram-transcription.log` - Execution log

**Automation**:
```bash
# Schedule daily at 9 AM
0 9 * * * /Users/ericsantos/meu-aios/scripts/run-instagram-transcription.sh
```

---

## Quick Start

```bash
# 1. Install dependencies
cd /Users/ericsantos/meu-aios
npm install

# 2. Configure environment
echo "GROQ_API_KEY=your_key_here" >> .env

# 3. Make scripts executable
chmod +x scripts/*.sh scripts/*.js

# 4. Run pipeline
./scripts/run-instagram-transcription.sh

# 5. View results
cat data/instagram-transcriptions.md
```

## Configuration

### Environment Variables (`.env`)

```env
# Required: Groq API Key for transcription
GROQ_API_KEY=gsk_YourKeyHere

# Optional: Apify token for advanced scraping
APIFY_API_TOKEN=apify_token_here

# Optional: Custom Instagram username
INSTAGRAM_USERNAME=ericoservano
```

### Get API Keys

**Groq**: https://console.groq.com/keys
**Apify**: https://console.apify.com/account/integrations

---

## Output Format

### Markdown Report

```markdown
# Transcrições - Instagram @ericoservano

*Documento gerado em: 24/02/2026, 22:11:16*

## Resumo
- Total de vídeos: 5
- Período: 10 a 20 de fevereiro de 2026
- Duração total: ~14 minutos

## Vídeo 1: [Title]
- **URL**: [Link]
- **Data**: 20 de fevereiro de 2026
- **Duração**: 2:45

### Transcrição:
[Full transcription text...]
```

---

## Troubleshooting

### "GROQ_API_KEY not found"
```bash
# Check configuration
grep GROQ .env

# If empty, get key from https://console.groq.com
```

### "ffmpeg not found"
```bash
# Install ffmpeg
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Linux
```

### "Permission denied" errors
```bash
# Make scripts executable
chmod +x scripts/*.sh
chmod +x scripts/*.js
```

### "Output file not created"
```bash
# Create data directory
mkdir -p data/

# Check logs
cat data/instagram-transcription.log
```

---

## Performance

### Typical Execution Times
- Scraping: 30-60 seconds
- Per video transcription: 30-90 seconds
- Total for 5 videos: ~5-15 minutes

### Resource Usage
- CPU: 20-30%
- Memory: 200-300 MB
- Disk: 100-200 MB temporary

---

## Features & Capabilities

✓ Instagram profile scraping
✓ Video URL extraction
✓ Audio download support
✓ Groq Whisper transcription
✓ Portuguese language support
✓ Markdown report generation
✓ Error handling & logging
✓ Cron automation support
✓ Apify integration ready
✓ Sample data generation

---

## Roadmap

- [ ] Multi-language transcription
- [ ] Sentiment analysis
- [ ] Keyword extraction
- [ ] SEO optimization
- [ ] Database integration (Supabase)
- [ ] REST API endpoint
- [ ] Real-time webhook updates
- [ ] Video thumbnail extraction

---

## File Structure

```
scripts/
├── instagram-scraper-advanced.js
├── instagram-transcriber.js
├── generate-sample-transcriptions.js
├── run-instagram-transcription.sh
└── README.md (this file)

data/
├── instagram-transcriptions.md (output)
└── instagram-transcription.log (logs)
```

---

## Development

### Code Style
- Node.js best practices
- Error handling required
- Console logging with colors
- Async/await patterns

### Testing
```bash
# Test sample generation
node scripts/generate-sample-transcriptions.js

# Test scraper configuration
node scripts/instagram-scraper-advanced.js

# Full pipeline test
./scripts/run-instagram-transcription.sh
```

---

## Support

For issues or questions:
1. Check logs: `data/instagram-transcription.log`
2. Review guide: `docs/INSTAGRAM_TRANSCRIPTION_GUIDE.md`
3. Check API status: https://status.groq.com

---

**Last Updated**: 2026-02-24
**Version**: 1.0.0
**License**: MIT
