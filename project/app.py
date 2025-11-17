import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify

from recommendation_model import recommend, available_titles

# Create a session with retry strategy
session = requests.Session()
retry_strategy = Retry(
    total=3,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "OPTIONS"],
    backoff_factor=1
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("http://", adapter)
session.mount("https://", adapter)

def test_tmdb_connection():
    """Test if TMDB API is accessible"""
    try:
        test_response = _tmdb_get('/configuration', retries=1)
        print("✅ TMDB API connection successful")
        return True
    except Exception as e:
        print(f"❌ TMDB API connection failed: {e}")
        return False

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET', 'dev_secret')

TMDB_API_KEY = os.environ.get('TMDB_API_KEY', '3a0e0a87f6fea7394239dfedc7b58620')
TMDB_API_BASE = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'


def _tmdb_get(path, params=None, retries=3):
    if TMDB_API_KEY is None:
        raise EnvironmentError('TMDB_API_KEY environment variable not set')
    
    url = f"{TMDB_API_BASE}{path}"
    query = {'api_key': TMDB_API_KEY}
    if params:
        query.update(params)
    
    # Add headers to improve connection stability
    headers = {
        'User-Agent': 'CineMatch Movie Recommendation System',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
    }
    
    for attempt in range(retries):
        try:
            resp = session.get(
                url, 
                params=query, 
                timeout=(5, 15),  # connection timeout, read timeout
                headers=headers,
                verify=True
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.exceptions.ConnectionError, 
                requests.exceptions.Timeout,
                requests.exceptions.RequestException) as e:
            print(f"TMDB API attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                import time
                time.sleep(1 * (attempt + 1))  # exponential backoff
                continue
            else:
                raise e


def is_movie_filtered(movie_title):
    """Filter out specific movies that shouldn't be displayed"""
    filtered_titles = [
        'Tee Yai: Born to Be Bad',
        # Add other movies to filter here
    ]
    return movie_title in filtered_titles

def get_movie_details(tmdb_id):
    try:
        print(f"Fetching movie details for TMDB ID: {tmdb_id}")
        movie = _tmdb_get(f'/movie/{tmdb_id}')
        
        # Check if movie should be filtered
        if is_movie_filtered(movie.get('title', '')):
            print(f"Movie '{movie.get('title', '')}' is filtered out")
            return None
        
        # Get credits separately with error handling
        try:
            credits = _tmdb_get(f'/movie/{tmdb_id}/credits')
        except Exception as e:
            print(f"Failed to get credits for {tmdb_id}: {e}")
            credits = {'cast': [], 'crew': []}
        
        # Keep TMDB structure for frontend compatibility
        genres = movie.get('genres', [])
        overview = movie.get('overview', 'No overview available.')
        release_date = movie.get('release_date', 'Unknown')
        poster_path = movie.get('poster_path')
        backdrop_path = movie.get('backdrop_path')
        
        cast = credits.get('cast', [])[:8]
        crew = credits.get('crew', [])
        directors = [c['name'] for c in crew if c.get('job') == 'Director']

        movie_details = {
            'id': tmdb_id,
            'title': movie.get('title', 'Unknown Title'),
            'poster': TMDB_IMAGE_BASE + poster_path if poster_path else None,  # Legacy support
            'poster_path': poster_path,  # TMDB format
            'backdrop_path': backdrop_path,  # TMDB format
            'overview': overview,
            'release_date': release_date,
            'vote_average': movie.get('vote_average', 0),
            'vote_count': movie.get('vote_count', 0),
            'runtime': movie.get('runtime'),
            'tagline': movie.get('tagline'),
            'budget': movie.get('budget', 0),
            'revenue': movie.get('revenue', 0),
            'production_companies': movie.get('production_companies', []),
            'spoken_languages': movie.get('spoken_languages', []),
            'genres': genres,
            'cast': cast,
            'directors': directors,
        }
        
        print(f"Successfully fetched details for: {movie_details['title']}")
        return movie_details
        
    except Exception as e:
        print(f"Error fetching movie details for {tmdb_id}: {e}")
        # Return a fallback movie object
        return {
            'id': tmdb_id,
            'title': 'Movie Details Unavailable',
            'poster': None,
            'poster_path': None,
            'backdrop_path': None,
            'overview': 'Sorry, movie details could not be loaded at this time.',
            'release_date': 'Unknown',
            'vote_average': 0,
            'vote_count': 0,
            'runtime': None,
            'tagline': None,
            'genres': [{'name': 'Unknown'}],
            'cast': [],
            'directors': ['Unknown'],
        }


@app.route('/', methods=['GET'])
def index():
    try:
        titles = sorted([t.title() for t in available_titles()])
    except Exception:
        titles = []
    return render_template('netflix-index.html', titles=titles)


@app.route('/api/titles', methods=['GET'])
def api_titles():
    """Return JSON list of matching movie titles for autocomplete.

    Query param: q
    """
    q = request.args.get('q', '').strip().lower()
    print(f"API called with query: '{q}'")
    
    try:
        titles = available_titles()
        print(f"Available titles count: {len(titles)}")
    except Exception as e:
        print(f"Error getting available titles: {e}")
        return jsonify([])

    if not q:
        # return a limited set
        out = [t.title() for t in titles[:200]]
        print(f"No query, returning {len(out)} titles")
    else:
        matches = [t for t in titles if q in t.lower()]
        out = [m.title() for m in matches[:50]]
        print(f"Query '{q}' found {len(matches)} matches, returning {len(out)}")

    return jsonify(out)

@app.route('/api/trailer/<int:movie_id>', methods=['GET'])
def get_movie_trailer(movie_id):
    """Get YouTube trailer for a movie"""
    try:
        # First get movie details
        response = session.get(f'https://api.themoviedb.org/3/movie/{movie_id}/videos?api_key={TMDB_API_KEY}')
        if response.status_code == 200:
            videos = response.json().get('results', [])
            
            # Find trailer video
            trailer = None
            for video in videos:
                if video.get('type') == 'Trailer' and video.get('site') == 'YouTube':
                    trailer = {
                        'key': video['key'],
                        'name': video['name'],
                        'site': video['site']
                    }
                    break
            
            if trailer:
                return jsonify(trailer)
            else:
                return jsonify({'error': 'No trailer found'}), 404
        else:
            return jsonify({'error': 'Failed to fetch trailer'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/recommend', methods=['POST'])
def recommend_route():
    movie = request.form.get('movie')
    if not movie:
        flash('Please enter a movie title to search')
        return redirect(url_for('index'))

    try:
        recs = recommend(movie, top_n=20)  # Get more recommendations for pagination
    except Exception as e:
        flash(str(e))
        return redirect(url_for('index'))

    enriched = []
    for r in recs:
        try:
            info = get_movie_details(r['id'])
            if not info.get('poster'):
                continue
            enriched.append(info)
            if len(enriched) >= 15:  # Load more for infinite scroll
                break
        except Exception:
            continue

    if len(enriched) == 0:
        flash('No recommendations with available posters found. Try another title.')
        return redirect(url_for('index'))

    return render_template('netflix-recommend.html', 
                             recommendations=enriched, 
                             searched_movie=movie,
                             titles=available_titles())

@app.route('/api/recommendations', methods=['GET'])
def api_recommendations():
    """API endpoint for infinite scroll and filtering"""
    movie = request.args.get('movie', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 6))
    genre_filter = request.args.get('genre', '')
    year_filter = request.args.get('year', '')
    rating_filter = float(request.args.get('rating', 0))
    
    try:
        # Get base recommendations
        recs = recommend(movie, top_n=50)
        
        enriched = []
        for r in recs:
            try:
                info = get_movie_details(r['id'])
                if not info:
                    continue
                    
                # Only include movies with posters for better UX
                if not info.get('poster_path') and not info.get('poster'):
                    continue
                    
                # Apply filters
                if genre_filter and info.get('genres'):
                    genre_names = [g.get('name', '').lower() for g in info['genres'] if isinstance(g, dict)]
                    if genre_filter.lower() not in ' '.join(genre_names):
                        continue
                        
                if year_filter and info.get('release_date'):
                    movie_year = info['release_date'][:4]
                    if movie_year != year_filter:
                        continue
                        
                if rating_filter > 0 and info.get('vote_average', 0) < rating_filter:
                    continue
                    
                enriched.append(info)
            except Exception:
                continue
        
        # Paginate results
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        page_results = enriched[start_idx:end_idx]
        
        return jsonify({
            'movies': page_results,
            'page': page,
            'per_page': per_page,
            'total': len(enriched),
            'has_next': end_idx < len(enriched)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recent', methods=['POST'])
def add_recent_movie():
    """Track recently viewed movies (client-side storage)"""
    movie_data = request.get_json()
    # This is handled client-side with localStorage
    # Server just acknowledges the request
    return jsonify({'status': 'success'})

@app.route('/api/popular', methods=['GET'])
def get_popular_movies():
    """Get popular movies for trending section"""
    try:
        response = session.get(f'https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&page=1')
        if response.status_code == 200:
            movies = response.json().get('results', [])
            # Filter out unwanted movies
            filtered_movies = []
            for movie in movies:
                if not is_movie_filtered(movie.get('title', '')):
                    filtered_movies.append(movie)
                if len(filtered_movies) >= 12:
                    break
            return jsonify(filtered_movies)
        else:
            return jsonify({'error': 'Failed to fetch popular movies'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/movie/<int:movie_id>', methods=['GET'])
def movie_details(movie_id):
    try:
        print(f"Movie details route called for ID: {movie_id}")
        info = get_movie_details(movie_id)
        
        if not info:
            # Movie was filtered out
            flash('⚠️ This movie is not available for viewing.')
            return redirect(url_for('index'))
        
        if info and info.get('title') != 'Movie Details Unavailable':
            return render_template('netflix-details.html', movie=info)
        else:
            # Show error page with fallback content
            flash('⚠️ Some movie details may be unavailable due to API connectivity issues.')
            return render_template('netflix-details.html', movie=info)
            
    except Exception as e:
        print(f"Error in movie_details route for ID {movie_id}: {e}")
        
        # Create a minimal fallback movie object
        fallback_movie = {
            'id': movie_id,
            'title': 'Movie Details Currently Unavailable',
            'poster': None,
            'overview': 'We\'re experiencing connectivity issues with our movie database. Please try again later.',
            'release_date': 'Unknown',
            'genres': ['Unavailable'],
            'cast': [],
            'directors': ['Unknown'],
        }
        
        flash('⚠️ Movie details temporarily unavailable due to connectivity issues.')
        return render_template('netflix-details.html', movie=fallback_movie)


if __name__ == '__main__':
    print("🎬 Starting CineMatch Movie Recommendation System...")
    print("🔗 Testing TMDB API connection...")
    
    # Test API connection on startup
    api_available = test_tmdb_connection()
    if not api_available:
        print("⚠️  TMDB API unavailable - running in limited mode")
    
    print("🚀 Server starting on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
