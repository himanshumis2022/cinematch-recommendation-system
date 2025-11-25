import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor
import threading
import time

from recommendation_model import recommend, available_titles

# Performance optimizations
CACHE_TIMEOUT = 300  # 5 minutes
movie_cache = {}
cache_timestamps = {}
cache_lock = threading.Lock()

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

def get_cached_movie_details(tmdb_id):
    """Get movie details with caching for better performance."""
    with cache_lock:
        current_time = time.time()
        
        # Check if we have a valid cached result
        if (tmdb_id in movie_cache and 
            tmdb_id in cache_timestamps and 
            current_time - cache_timestamps[tmdb_id] < CACHE_TIMEOUT):
            return movie_cache[tmdb_id]
        
        # Fetch new data
        movie_details = get_movie_details(tmdb_id)
        
        # Cache the result
        if movie_details:  # Only cache successful results
            movie_cache[tmdb_id] = movie_details
            cache_timestamps[tmdb_id] = current_time
            
            # Clean old cache entries (keep cache size manageable)
            if len(movie_cache) > 500:
                oldest_key = min(cache_timestamps, key=cache_timestamps.get)
                del movie_cache[oldest_key]
                del cache_timestamps[oldest_key]
        
        return movie_details

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

    # Use cached movie details for faster loading
    enriched = []
    
    # Process in smaller batches for faster initial loading
    def process_movie_batch(movie_recs, batch_size=5):
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = []
            
            for r in movie_recs[:batch_size]:
                future = executor.submit(get_cached_movie_details, r['id'])
                futures.append((future, r))
            
            batch_results = []
            for future, r in futures:
                try:
                    info = future.result(timeout=3)  # 3 second timeout per request
                    if info and info.get('poster_path'):  # Check for poster availability
                        batch_results.append(info)
                except Exception as e:
                    print(f"Error processing movie {r['id']}: {e}")
                    continue
                    
            return batch_results
    
    # Process first batch quickly for immediate display
    enriched = process_movie_batch(recs, batch_size=8)
    
    # If we need more, process additional movies
    if len(enriched) < 6 and len(recs) > 8:
        additional = process_movie_batch(recs[8:], batch_size=7)
        enriched.extend(additional)
    
    # Limit initial load to 12 movies for faster response
    enriched = enriched[:12]

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
        # Use caching key to avoid recomputing same requests
        cache_key = f"rec_{movie}_{genre_filter}_{year_filter}_{rating_filter}"
        
        # Check cache first for faster response
        with cache_lock:
            current_time = time.time()
            if (cache_key in movie_cache and 
                cache_key in cache_timestamps and 
                current_time - cache_timestamps[cache_key] < CACHE_TIMEOUT):
                all_enriched = movie_cache[cache_key]
            else:
                # Get base recommendations (reduced number for faster response)
                recs = recommend(movie, top_n=30)
                
                # Process movies in parallel for much faster loading
                def fetch_and_filter_movie(r):
                    try:
                        info = get_cached_movie_details(r['id'])
                        if not info:
                            return None
                            
                        # Only include movies with posters for better UX
                        if not info.get('poster_path') and not info.get('poster'):
                            return None
                            
                        # Apply filters
                        if genre_filter and info.get('genres'):
                            genre_names = [g.get('name', '').lower() for g in info['genres'] if isinstance(g, dict)]
                            if genre_filter.lower() not in ' '.join(genre_names):
                                return None
                                
                        if year_filter and info.get('release_date'):
                            movie_year = info['release_date'][:4]
                            if movie_year != year_filter:
                                return None
                                
                        if rating_filter > 0 and info.get('vote_average', 0) < rating_filter:
                            return None
                            
                        return info
                    except Exception:
                        return None
                
                # Use parallel processing for much faster loading
                with ThreadPoolExecutor(max_workers=6) as executor:
                    # Process movies in parallel
                    futures = [executor.submit(fetch_and_filter_movie, r) for r in recs]
                    all_enriched = []
                    
                    for future in futures:
                        try:
                            result = future.result(timeout=2)  # Fast timeout for responsiveness
                            if result:
                                all_enriched.append(result)
                            # Stop when we have enough results
                            if len(all_enriched) >= 24:
                                break
                        except Exception:
                            continue
                
                # Cache the results
                movie_cache[cache_key] = all_enriched
                cache_timestamps[cache_key] = current_time
        
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
    """Get popular movies for trending section with caching"""
    cache_key = "popular_movies"
    
    # Check cache first for instant loading
    with cache_lock:
        current_time = time.time()
        if (cache_key in movie_cache and 
            cache_key in cache_timestamps and 
            current_time - cache_timestamps[cache_key] < CACHE_TIMEOUT):
            return jsonify(movie_cache[cache_key])
    
    try:
        # Use faster timeout for popular movies
        response = session.get(
            f'https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&page=1',
            timeout=(3, 8)  # Faster timeout
        )
        if response.status_code == 200:
            movies = response.json().get('results', [])
            # Filter and limit movies in one pass for better performance
            filtered_movies = [
                movie for movie in movies 
                if not is_movie_filtered(movie.get('title', ''))
            ][:15]  # Get a few extra for better selection
            
            # Cache the results
            with cache_lock:
                movie_cache[cache_key] = filtered_movies
                cache_timestamps[cache_key] = current_time
            
            return jsonify(filtered_movies)
        else:
            return jsonify({'error': 'Failed to fetch popular movies'}), 500
    except Exception as e:
        # Return cached data if available, even if expired
        with cache_lock:
            if cache_key in movie_cache:
                return jsonify(movie_cache[cache_key])
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
