# youtube-bilingual-notes

CLI: **YouTube URL → audio → timestamped transcript → bilingual (EN→CN) course notes** (with key quotes).

## Features
- Input: YouTube URL (single video, no playlist)
- Output (local files):
  - `01_transcript.srt`
  - `01_transcript.jsonl`
  - `02_notes_segment_00-05.md` ...
  - `03_notes_full_bilingual.md`
- Notes style: **EN→CN pairing**, plus **3–5 original English quotes per segment**.

## Requirements
- Node.js 18+
- `yt-dlp` installed and available in PATH
- `OPENAI_API_KEY` set in environment

## Install

```bash
npm i
npm run build
npm link
```

## Usage

```bash
export OPENAI_API_KEY=... 

ytbnotes "https://www.youtube.com/watch?v=xxxx" --outDir ./out --chunkMinutes 5 --model gpt-4.1-mini
```

Options:
- `--outDir` default `./out`
- `--chunkMinutes` default `5`
- `--model` default `gpt-4.1-mini`
- `--sttModel` default `whisper-1`
- `--keep-audio` keep `00_audio.mp3`

## Notes
- For stability, this tool segments by **time windows** and generates notes per segment, then produces a merged full handout.
- The transcription uses `verbose_json` to obtain timestamped segments.
