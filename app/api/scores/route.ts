import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define score entry structure
interface ScoreEntry {
  name: string;
  score: number;
  date: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// Helper to read scores from local JSON file
function readScores(): ScoreEntry[] {
  try {
    // 若 data/ 目錄不存在，自動建立
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(SCORES_FILE)) {
      // 若 scores.json 不存在，建立初始資料
      const initialScores: ScoreEntry[] = [];
      fs.writeFileSync(SCORES_FILE, JSON.stringify(initialScores, null, 2), 'utf-8');
      return initialScores;
    }

    const data = fs.readFileSync(SCORES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading scores:', error);
    return [];
  }
}

// Helper to write scores to local JSON file
function writeScores(scores: ScoreEntry[]): boolean {
  try {
    // 確保 data/ 目錄存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing scores:', error);
    return false;
  }
}

// GET /api/scores - Fetch high scores sorted descending
export async function GET() {
  const scores = readScores();
  // Sort descending
  const sortedScores = scores.sort((a, b) => b.score - a.score);
  return NextResponse.json(sortedScores);
}

// POST /api/scores - Submit a new high score
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, score } = body;

    // Validate request body
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    // Ensure score is a number (allow string input that parses to number, just in case)
    const parsedScore = Number(score);
    if (isNaN(parsedScore)) {
      return NextResponse.json({ error: 'Score must be a number' }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase().substring(0, 10); // max 10 characters
    const newEntry: ScoreEntry = {
      name: cleanName,
      score: parsedScore,
      date: new Date().toISOString(),
    };

    const scores = readScores();
    scores.push(newEntry);
    
    // Sort scores high to low
    const sortedScores = scores.sort((a, b) => b.score - a.score);
    
    // Limit to top 100 to avoid file growing indefinitely
    const topScores = sortedScores.slice(0, 100);

    const success = writeScores(topScores);
    if (!success) {
      return NextResponse.json({ error: 'Failed to write score to database' }, { status: 500 });
    }

    return NextResponse.json(topScores);
  } catch (error) {
    console.error('Error handling score submission:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
