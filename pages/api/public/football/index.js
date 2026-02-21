import nextConnect from 'next-connect';
import cors from '@middleware/cors';

const handler = nextConnect();

// --- TheSportsDB Configuration ---
const SPORTS_DB_API = 'https://www.thesportsdb.com/api/v1/json/123';

// Liga por defecto para partidos (puede cambiarse sin actualizar la app)
const DEFAULT_LEAGUE_ID = '4328'; // Premier League
// Puedes cambiar a otras ligas:
// '4335' - La Liga
// '4331' - Bundesliga
// '4332' - Serie A
// '4334' - Ligue 1

// --- ESPN Soccer Configuration ---
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports';
const NEWS_PAGE_SIZE = 6;
const DEFAULT_NEWS_LEAGUE = 'soccer/eng.1'; // Premier League

// Ligas disponibles para noticias (gestionadas desde el backend)
const NEWS_LEAGUES = [
  { id: 'soccer/eng.1', label: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'soccer/esp.1', label: 'La Liga', flag: '🇪🇸' },
  { id: 'soccer/ger.1', label: 'Bundesliga', flag: '🇩🇪' },
  { id: 'soccer/ita.1', label: 'Serie A', flag: '🇮🇹' },
  { id: 'soccer/fra.1', label: 'Ligue 1', flag: '🇫🇷' },
  { id: 'soccer/uefa.champions', label: 'Champions League', flag: '🏆' },
];

// Configuración general expuesta al frontend
const CONFIG = {
  defaultLeagueId: DEFAULT_LEAGUE_ID,
  defaultNewsLeague: DEFAULT_NEWS_LEAGUE,
  newsPageSize: NEWS_PAGE_SIZE,
};

/**
 * Main handler for football data
 * Query params:
 * - action: 'eventsByDate' | 'recentMatches' | 'upcomingMatches' | 'news' | 'liveScores' | 'newsLeagues' | 'config'
 * - date: (for eventsByDate) format: YYYY-MM-DD
 * - league: (for news) league ID from NEWS_LEAGUES
 * - leagueId: (for recentMatches/upcomingMatches) opcional, usa DEFAULT_LEAGUE_ID si no se especifica
 * - page: (for news) page number, default 1
 */
handler.use(cors).get(async (request, response) => {
  try {
    const {
      action,
      date,
      league = DEFAULT_NEWS_LEAGUE,
      leagueId = DEFAULT_LEAGUE_ID,
      page = 1,
    } = request.query;

    switch (action) {
      case 'eventsByDate':
        if (!date) {
          return response.status(400).json({
            message: 'El parámetro "date" es requerido (formato: YYYY-MM-DD)',
          });
        }
        const eventsByDate = await getEventsByDate(date);
        return response.status(200).json(eventsByDate);

      case 'recentMatches':
        const recentMatches = await getRecentMatches(leagueId);
        return response.status(200).json(recentMatches);

      case 'upcomingMatches':
        const upcomingMatches = await getUpcomingMatches(leagueId);
        return response.status(200).json(upcomingMatches);

      case 'news':
        const newsData = await getFootballNews(league, parseInt(page));
        return response.status(200).json(newsData);

      case 'liveScores':
        const liveScores = await getLiveScores();
        return response.status(200).json(liveScores);

      case 'newsLeagues':
        return response.status(200).json(NEWS_LEAGUES);

      case 'config':
        return response.status(200).json(CONFIG);

      default:
        return response.status(400).json({
          message:
            'Acción no válida. Usa: eventsByDate, recentMatches, upcomingMatches, news, liveScores, newsLeagues, config',
        });
    }
  } catch (error) {
    console.error('Error en football API:', error);
    response.status(500).json({
      message: error.message || 'Error al obtener datos de football',
    });
  }
});

// --- TheSportsDB Functions ---

async function getEventsByDate(date) {
  try {
    const response = await fetch(`${SPORTS_DB_API}/eventsday.php?d=${date}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error fetching events by date:', error);
    throw error;
  }
}

async function getRecentMatches(leagueId = DEFAULT_LEAGUE_ID) {
  try {
    const response = await fetch(
      `${SPORTS_DB_API}/eventspastleague.php?id=${leagueId}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.events || []).slice(0, 10);
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    throw error;
  }
}

async function getUpcomingMatches(leagueId = DEFAULT_LEAGUE_ID) {
  try {
    const response = await fetch(
      `${SPORTS_DB_API}/eventsnextleague.php?id=${leagueId}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.events || []).slice(0, 10);
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    throw error;
  }
}

// --- ESPN Soccer Functions ---

async function getFootballNews(league = DEFAULT_NEWS_LEAGUE, page = 1) {
  try {
    const needed = page * NEWS_PAGE_SIZE;
    const response = await fetch(
      `${ESPN_API}/${league}/news?limit=${needed + 1}`
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const all = data.articles || [];
    const start = (page - 1) * NEWS_PAGE_SIZE;
    const articles = all.slice(start, start + NEWS_PAGE_SIZE);
    const hasMore = all.length > needed;
    return { articles, hasMore };
  } catch (error) {
    console.error('Error fetching football news:', error);
    throw error;
  }
}

async function getLiveScores() {
  try {
    const response = await fetch(`${ESPN_API}/soccer/eng.1/scoreboard`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (data.events || []).slice(0, 8);
  } catch (error) {
    console.error('Error fetching live scores:', error);
    throw error;
  }
}

export default handler;
