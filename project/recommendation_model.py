import os
import ast
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Module-level caches to ensure model is loaded once
_data_loaded = False
_movies_df = None
_indices = None
_cosine_sim = None


def _get_director(crew_list):
    for member in crew_list:
        if member.get('job') == 'Director':
            return member.get('name', '')
    return ''


def _extract_names(obj_list, top_n=None):
    names = []
    for entry in obj_list:
        name = entry.get('name') if isinstance(entry, dict) else None
        if name:
            names.append(name.replace(' ', ''))
    if top_n:
        return names[:top_n]
    return names


def _create_soup(row):
    return ' '.join(row['keywords']) + ' ' + ' '.join(row['cast']) + ' ' + row['director'] + ' ' + ' '.join(row['genres']) + ' ' + row['overview']


def _load_and_build():
    global _data_loaded, _movies_df, _indices, _cosine_sim
    if _data_loaded:
        return

    base = os.path.dirname(__file__)
    movies_path = os.path.join(base, '..', 'tmdb_5000_movies.csv')
    credits_path = os.path.join(base, '..', 'tmdb_5000_credits.csv')

    if not os.path.exists(movies_path) or not os.path.exists(credits_path):
        raise FileNotFoundError('CSV files not found. Place `tmdb_5000_movies.csv` and `tmdb_5000_credits.csv` in the project root (one level above this module).')

    movies = pd.read_csv(movies_path)
    credits = pd.read_csv(credits_path)

    # merge on id when possible, else title
    if 'movie_id' in credits.columns and 'id' in movies.columns:
        credits = credits.rename(columns={'movie_id': 'credit_movie_id'})
        movies = movies.merge(credits, left_on='id', right_on='credit_movie_id')
    else:
        movies = movies.merge(credits, left_on='title', right_on='title')

    # After merging the two dataframes both may contain a `title` column
    # (e.g. `title_x` and `title_y`). Ensure a single canonical `title`
    # column exists so downstream code can rely on it.
    if 'title' not in movies.columns:
        if 'title_x' in movies.columns:
            movies['title'] = movies['title_x']
        elif 'title_y' in movies.columns:
            movies['title'] = movies['title_y']
        elif 'original_title' in movies.columns:
            movies['title'] = movies['original_title']
        else:
            raise KeyError(f"Merged DataFrame has no 'title' column. Columns: {list(movies.columns)}")

    keep_cols = ['id', 'title', 'genres', 'keywords', 'overview', 'cast', 'crew']
    movies = movies[[c for c in keep_cols if c in movies.columns]]

    # Ensure overview exists and is a string Series
    if 'overview' in movies.columns:
        movies['overview'] = movies['overview'].fillna('')
    else:
        movies['overview'] = [''] * len(movies)

    for feature in ['genres', 'keywords', 'cast', 'crew']:
        if feature in movies.columns:
            movies[feature] = movies[feature].fillna('[]')
            movies[feature] = movies[feature].apply(lambda x: ast.literal_eval(x) if isinstance(x, str) else x)
        else:
            movies[feature] = [[] for _ in range(len(movies))]

    movies['genres'] = movies['genres'].apply(lambda x: _extract_names(x))
    movies['keywords'] = movies['keywords'].apply(lambda x: _extract_names(x))
    movies['cast'] = movies['cast'].apply(lambda x: _extract_names(x, top_n=3))
    movies['director'] = movies['crew'].apply(lambda x: _get_director(x) if isinstance(x, list) else '')

    movies['soup'] = movies.apply(lambda x: _create_soup(x), axis=1)

    count = CountVectorizer(stop_words='english')
    count_matrix = count.fit_transform(movies['soup'])

    cosine_sim = cosine_similarity(count_matrix, count_matrix)

    # Normalize title column and build index lookup (lowercased)
    movies['title'] = movies['title'].astype(str)
    title_index = movies['title'].str.lower()
    indices = pd.Series(movies.index, index=title_index).drop_duplicates()

    _movies_df = movies.reset_index(drop=True)
    _indices = indices
    _cosine_sim = cosine_sim
    _data_loaded = True


def recommend(title, top_n=5):
    global _data_loaded, _movies_df, _indices, _cosine_sim
    if not _data_loaded:
        _load_and_build()

    if not isinstance(title, str):
        raise ValueError('Title must be a string')

    title_key = title.strip().lower()
    if title_key not in _indices:
        matches = [t for t in _indices.index if title_key in t]
        if len(matches) == 0:
            raise ValueError(f'Movie "{title}" not found in database')
        title_key = matches[0]

    idx = _indices[title_key]

    sim_scores = list(enumerate(_cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    recommendations = []
    count = 0
    for i, score in sim_scores[1:]:
        tmdb_id = int(_movies_df.iloc[i]['id'])
        rec_title = _movies_df.iloc[i]['title']
        recommendations.append({'id': tmdb_id, 'title': rec_title, 'score': float(score)})
        count += 1
        if count >= top_n:
            break

    return recommendations


def available_titles():
    if not _data_loaded:
        _load_and_build()
    return list(_indices.index)
