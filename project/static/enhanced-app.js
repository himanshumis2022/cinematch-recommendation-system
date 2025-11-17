// Enhanced Netflix-Style Movie Recommendation System - Phase 1 Features
// Features: Infinite Scroll, Recently Viewed, Advanced Filters, Trailer Integration

class NetflixEnhancedApp {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMoreResults = true;
        this.currentMovie = '';
        this.currentFilters = {
            genre: '',
            year: '',
            rating: 0
        };
        this.recentlyViewed = this.loadRecentlyViewed();
        this.searchCache = new Map();
        
        this.init();
    }

    init() {
        this.setupInfiniteScroll();
        this.setupFilters();
        this.setupRecentlyViewed();
        this.setupTrailerModal();
        this.setupCastModal();
        this.setupAutocomplete();
        this.loadPopularMovies();
        this.setupMobileOptimizations();
        this.setupAccessibility();
        this.setupEnhancedSearch();
        this.setupProgressiveImages();
        this.setupKeyboardNavigation();
        
        // Load initial recommendations if we're on the recommendations page
        if (window.location.pathname.includes('recommend')) {
            this.loadInitialRecommendations();
        }
    }

    // ========== INFINITE SCROLL IMPLEMENTATION ==========
    setupInfiniteScroll() {
        if (window.location.pathname.includes('recommend') || document.querySelector('.movie-grid')) {
            window.addEventListener('scroll', this.throttle(() => {
                if (this.shouldLoadMore()) {
                    this.loadMoreMovies();
                }
            }, 200));
        }
    }

    shouldLoadMore() {
        const scrollPosition = window.innerHeight + window.scrollY;
        const documentHeight = document.documentElement.offsetHeight;
        return scrollPosition >= documentHeight - 1000 && 
               !this.isLoading && 
               this.hasMoreResults;
    }

    async loadInitialRecommendations() {
        console.log('Loading initial recommendations...');
        const grid = document.querySelector('.movie-grid');
        if (!grid) return;
        
        // Clear existing server-rendered cards and add our enhanced ones
        const existingCards = grid.querySelectorAll('.movie-card');
        if (existingCards.length > 0) {
            console.log('Found existing server-rendered cards, enhancing them...');
            existingCards.forEach(card => {
                const img = card.querySelector('img');
                if (img) {
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.3s ease';
                    img.onload = () => {
                        img.style.opacity = '1';
                        console.log('Enhanced existing image loaded');
                    };
                    img.onerror = () => {
                        console.log('Enhanced existing image failed, showing fallback');
                        img.style.display = 'none';
                        const fallback = card.querySelector('.poster-fallback') || 
                                       card.querySelector('.placeholder-poster');
                        if (fallback) fallback.style.display = 'flex';
                    };
                }
            });
        }
    }

    async loadMoreMovies() {
        if (this.isLoading || !this.hasMoreResults) return;

        this.isLoading = true;
        this.showLoadingIndicator();

        try {
            const params = new URLSearchParams({
                movie: this.currentMovie,
                page: this.currentPage + 1,
                per_page: 6,
                ...this.currentFilters
            });

            const response = await fetch(`/api/recommendations?${params}`);
            const data = await response.json();

            if (data.movies && data.movies.length > 0) {
                this.appendMoviesToGrid(data.movies);
                this.currentPage = data.page;
                this.hasMoreResults = data.has_next;
            } else {
                this.hasMoreResults = false;
                this.showNoMoreResults();
            }
        } catch (error) {
            console.error('Error loading more movies:', error);
            this.showErrorMessage('Failed to load more movies. Please try again.');
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    appendMoviesToGrid(movies) {
        const grid = document.querySelector('.movie-grid');
        if (!grid) return;

        movies.forEach(movie => {
            const movieCard = this.createMovieCard(movie);
            grid.appendChild(movieCard);
            
            // Animate in
            setTimeout(() => {
                movieCard.classList.add('fade-in');
            }, 50);
        });
    }

    createMovieCard(movie) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.id;
        
        // Handle multiple poster formats
        let posterPath = null;
        if (movie.poster_path) {
            posterPath = movie.poster_path;
        } else if (movie.poster) {
            posterPath = movie.poster.replace('https://image.tmdb.org/t/p/w500', '');
        }
        
        // Debug logging
        console.log(`Creating card for ${movie.title}, poster: ${posterPath ? 'YES' : 'NO'}`);
        
        card.innerHTML = `
            ${posterPath ? 
                `<img src="https://image.tmdb.org/t/p/w500${posterPath}" 
                     alt="${movie.title}" 
                     class="movie-poster"
                     style="opacity: 0; transition: opacity 0.3s ease;"
                     onload="this.style.opacity='1'; console.log('Movie image loaded: ${movie.title}');"
                     onerror="console.log('Movie image failed: ${movie.title}'); this.onerror=null; this.parentElement.querySelector('.poster-fallback').style.display='flex'; this.style.display='none';">
                 <div class="poster-fallback" style="display:none;">
                    <span class="poster-icon">🎬</span>
                    <span class="poster-title">${movie.title.slice(0, 20)}${movie.title.length > 20 ? '...' : ''}</span>
                 </div>` :
                `<div class="placeholder-poster">
                    <span class="poster-icon">🎬</span>
                    <span class="poster-title">${movie.title.slice(0, 20)}${movie.title.length > 20 ? '...' : ''}</span>
                </div>`
            }
            
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    ${movie.vote_average ? `<span class="movie-rating">⭐ ${movie.vote_average.toFixed(1)}</span>` : ''}
                    ${movie.release_date ? `<span>${movie.release_date.slice(0, 4)}</span>` : ''}
                    ${movie.genres && movie.genres[0] ? `<span>${movie.genres[0].name}</span>` : ''}
                </div>
                ${movie.overview ? `<p class="movie-description">${movie.overview}</p>` : ''}
                
                <div class="movie-actions">
                    <button class="action-btn trailer-btn" title="Watch Trailer" data-movie-id="${movie.id}">
                        ▶️
                    </button>
                    <button class="action-btn" title="Add to List" onclick="netflixApp.addToWatchlist(${movie.id})">
                        ➕
                    </button>
                    <button class="action-btn" title="Like" onclick="netflixApp.likeMovie(${movie.id})">
                        👍
                    </button>
                    <button class="action-btn" title="More Info" onclick="netflixApp.viewMovieDetails(${movie.id})">
                        ℹ️
                    </button>
                </div>
            </div>
        `;

        // Add click handler for card
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                this.viewMovieDetails(movie.id);
            }
        });

        // Add trailer button handler
        const trailerBtn = card.querySelector('.trailer-btn');
        if (trailerBtn) {
            trailerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrailer(movie.id, movie.title);
            });
        }

        return card;
    }

    // ========== ADVANCED SEARCH FILTERS ==========
    setupFilters() {
        this.createFiltersUI();
        this.bindFilterEvents();
    }

    createFiltersUI() {
        const searchSection = document.querySelector('.search-results, .netflix-main');
        if (!searchSection) return;

        const filtersHTML = `
            <div class="advanced-filters" id="advancedFilters">
                <div class="filters-toggle">
                    <button class="filters-btn" onclick="netflixApp.toggleFilters()">
                        🔍 Advanced Filters
                    </button>
                </div>
                
                <div class="filters-content hidden" id="filtersContent">
                    <div class="filter-group">
                        <label for="genreFilter">Genre:</label>
                        <select id="genreFilter" class="filter-select">
                            <option value="">All Genres</option>
                            <option value="action">Action</option>
                            <option value="adventure">Adventure</option>
                            <option value="animation">Animation</option>
                            <option value="comedy">Comedy</option>
                            <option value="crime">Crime</option>
                            <option value="drama">Drama</option>
                            <option value="family">Family</option>
                            <option value="fantasy">Fantasy</option>
                            <option value="history">History</option>
                            <option value="horror">Horror</option>
                            <option value="music">Music</option>
                            <option value="mystery">Mystery</option>
                            <option value="romance">Romance</option>
                            <option value="science fiction">Sci-Fi</option>
                            <option value="thriller">Thriller</option>
                            <option value="war">War</option>
                            <option value="western">Western</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="yearFilter">Year:</label>
                        <select id="yearFilter" class="filter-select">
                            <option value="">All Years</option>
                            ${this.generateYearOptions()}
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label for="ratingFilter">Min Rating:</label>
                        <select id="ratingFilter" class="filter-select">
                            <option value="0">Any Rating</option>
                            <option value="6">6.0+</option>
                            <option value="7">7.0+</option>
                            <option value="8">8.0+</option>
                            <option value="9">9.0+</option>
                        </select>
                    </div>
                    
                    <div class="filter-actions">
                        <button class="netflix-btn btn-primary" onclick="netflixApp.applyFilters()">
                            Apply Filters
                        </button>
                        <button class="netflix-btn btn-secondary" onclick="netflixApp.clearFilters()">
                            Clear All
                        </button>
                    </div>
                </div>
            </div>
        `;

        searchSection.insertAdjacentHTML('afterbegin', filtersHTML);
    }

    generateYearOptions() {
        const currentYear = new Date().getFullYear();
        let options = '';
        for (let year = currentYear; year >= 1950; year--) {
            options += `<option value="${year}">${year}</option>`;
        }
        return options;
    }

    bindFilterEvents() {
        const filters = ['genreFilter', 'yearFilter', 'ratingFilter'];
        filters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateCurrentFilters();
                });
            }
        });
    }

    toggleFilters() {
        const content = document.getElementById('filtersContent');
        if (content) {
            content.classList.toggle('hidden');
        }
    }

    updateCurrentFilters() {
        this.currentFilters = {
            genre: document.getElementById('genreFilter')?.value || '',
            year: document.getElementById('yearFilter')?.value || '',
            rating: parseFloat(document.getElementById('ratingFilter')?.value || '0')
        };
    }

    async applyFilters() {
        this.updateCurrentFilters();
        this.currentPage = 1;
        this.hasMoreResults = true;
        
        // Clear current results
        const grid = document.querySelector('.movie-grid');
        if (grid) {
            grid.innerHTML = '';
        }
        
        // Load filtered results
        await this.loadMoreMovies();
    }

    clearFilters() {
        document.getElementById('genreFilter').value = '';
        document.getElementById('yearFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        this.applyFilters();
    }

    // ========== RECENTLY VIEWED IMPLEMENTATION ==========
    setupRecentlyViewed() {
        this.displayRecentlyViewed();
    }

    loadRecentlyViewed() {
        try {
            const stored = localStorage.getItem('netflix_recently_viewed');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    saveRecentlyViewed() {
        try {
            localStorage.setItem('netflix_recently_viewed', JSON.stringify(this.recentlyViewed));
        } catch (error) {
            console.error('Failed to save recently viewed:', error);
        }
    }

    addToRecentlyViewed(movie) {
        // Remove if already exists
        this.recentlyViewed = this.recentlyViewed.filter(m => m.id !== movie.id);
        
        // Add to beginning
        this.recentlyViewed.unshift({
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date,
            timestamp: Date.now()
        });
        
        // Keep only last 12
        this.recentlyViewed = this.recentlyViewed.slice(0, 12);
        
        this.saveRecentlyViewed();
        this.displayRecentlyViewed();
    }

    displayRecentlyViewed() {
        if (this.recentlyViewed.length === 0) return;

        let recentSection = document.getElementById('recentlyViewedSection');
        
        if (!recentSection) {
            const mainContent = document.querySelector('.netflix-main');
            if (!mainContent) return;

            recentSection = document.createElement('section');
            recentSection.id = 'recentlyViewedSection';
            recentSection.className = 'netflix-row recently-viewed-section';
            
            mainContent.insertAdjacentElement('afterbegin', recentSection);
        }

        recentSection.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Recently Viewed</h2>
                <button class="view-all" onclick="netflixApp.clearRecentlyViewed()">Clear All</button>
            </div>
            <div class="movie-row">
                ${this.recentlyViewed.map(movie => {
                    const posterPath = movie.poster_path;
                    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
                    const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
                    
                    return `
                        <div class="row-movie-card" onclick="netflixApp.viewMovieDetails(${movie.id})">
                            ${posterPath ? 
                                `<img src="https://image.tmdb.org/t/p/w500${posterPath}" 
                                     alt="${movie.title}" 
                                     class="movie-poster"
                                     onload="this.style.opacity='1';"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="placeholder-poster" style="display:none;">
                                    <span class="poster-icon">🎬</span>
                                    <span class="poster-title">${movie.title.slice(0, 15)}${movie.title.length > 15 ? '...' : ''}</span>
                                 </div>` :
                                `<div class="placeholder-poster">
                                    <span class="poster-icon">🎬</span>
                                    <span class="poster-title">${movie.title.slice(0, 15)}${movie.title.length > 15 ? '...' : ''}</span>
                                </div>`
                            }
                            <div class="movie-info">
                                <h3 class="movie-title">${movie.title}</h3>
                                <div class="movie-meta">
                                    <span class="movie-rating">⭐ ${rating}</span>
                                    <span>${year}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    clearRecentlyViewed() {
        this.recentlyViewed = [];
        this.saveRecentlyViewed();
        const section = document.getElementById('recentlyViewedSection');
        if (section) {
            section.remove();
        }
    }

    // ========== MOVIE TRAILER INTEGRATION ==========
    setupTrailerModal() {
        // Create trailer modal if it doesn't exist
        if (!document.getElementById('trailerModal')) {
            const modalHTML = `
                <div id="trailerModal" class="trailer-modal hidden">
                    <div class="modal-backdrop" onclick="netflixApp.closeTrailer()"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="trailerTitle">Movie Trailer</h3>
                            <button class="modal-close" onclick="netflixApp.closeTrailer()">✕</button>
                        </div>
                        <div class="trailer-container">
                            <iframe id="trailerFrame" 
                                    src="" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen>
                            </iframe>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    async playTrailer(movieId, movieTitle) {
        const modal = document.getElementById('trailerModal');
        const titleElement = document.getElementById('trailerTitle');
        const iframe = document.getElementById('trailerFrame');
        
        titleElement.textContent = `${movieTitle} - Trailer`;
        modal.classList.remove('hidden');
        
        try {
            const response = await fetch(`/api/trailer/${movieId}`);
            const data = await response.json();
            
            if (data.key) {
                iframe.src = `https://www.youtube.com/embed/${data.key}?autoplay=1`;
            } else {
                this.showTrailerError('Trailer not available for this movie.');
            }
        } catch (error) {
            console.error('Error loading trailer:', error);
            this.showTrailerError('Failed to load trailer. Please try again.');
        }
    }

    closeTrailer() {
        const modal = document.getElementById('trailerModal');
        const iframe = document.getElementById('trailerFrame');
        
        modal.classList.add('hidden');
        iframe.src = '';
    }

    showTrailerError(message) {
        const container = document.querySelector('.trailer-container');
        container.innerHTML = `
            <div class="trailer-error">
                <div class="error-icon">🎬</div>
                <p>${message}</p>
                <button class="netflix-btn btn-primary" onclick="netflixApp.closeTrailer()">
                    Close
                </button>
            </div>
        `;
    }

    // ========== UTILITY FUNCTIONS ==========
    async loadPopularMovies() {
        try {
            console.log('Loading popular movies...');
            const response = await fetch('/api/popular');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const movies = await response.json();
            console.log('Popular movies loaded:', movies.length);
            this.updateTrendingSection(movies);
        } catch (error) {
            console.error('Error loading popular movies:', error);
            this.showSuccessMessage('Failed to load trending movies', 'error');
        }
    }

    updateTrendingSection(movies) {
        const trendingRow = document.querySelector('#popular-movies-row');
        if (!trendingRow || !movies.length) return;

        console.log('Updating trending section with', movies.length, 'movies');
        
        trendingRow.innerHTML = movies.slice(0, 8).map(movie => {
            const posterPath = movie.poster_path;
            const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A';
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            
            console.log(`Movie: ${movie.title}, Poster: ${posterPath ? 'YES' : 'NO'}`);
            
            return `
                <div class="row-movie-card" onclick="netflixApp.viewMovieDetails(${movie.id})">
                    ${posterPath ? 
                        `<img src="https://image.tmdb.org/t/p/w500${posterPath}" 
                             alt="${movie.title}" 
                             class="movie-poster"
                             style="opacity: 0; transition: opacity 0.3s ease;"
                             onload="this.style.opacity='1'; console.log('Image loaded: ${movie.title}');"
                             onerror="console.log('Image failed: ${movie.title}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="placeholder-poster" style="display:none;">
                            <span class="poster-icon">🎬</span>
                            <span class="poster-title">${movie.title.slice(0, 15)}${movie.title.length > 15 ? '...' : ''}</span>
                         </div>` :
                        `<div class="placeholder-poster">
                            <span class="poster-icon">🎬</span>
                            <span class="poster-title">${movie.title.slice(0, 15)}${movie.title.length > 15 ? '...' : ''}</span>
                        </div>`
                    }
                    <div class="movie-info">
                        <h3 class="movie-title">${movie.title}</h3>
                        <div class="movie-meta">
                            <span class="movie-rating">⭐ ${rating}</span>
                            <span>${releaseYear}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    viewMovieDetails(movieId) {
        // Track as recently viewed
        const movieCard = document.querySelector(`[data-movie-id="${movieId}"]`);
        if (movieCard) {
            const movieData = this.extractMovieDataFromCard(movieCard);
            this.addToRecentlyViewed(movieData);
        }
        
        window.location.href = `/movie/${movieId}`;
    }

    extractMovieDataFromCard(card) {
        const title = card.querySelector('.movie-title')?.textContent || 'Unknown';
        const poster = card.querySelector('.movie-poster')?.src || null;
        const rating = card.querySelector('.movie-rating')?.textContent?.replace('⭐ ', '') || 0;
        const year = card.querySelector('.movie-meta span:nth-child(2)')?.textContent || '';
        
        return {
            id: parseInt(card.dataset.movieId),
            title,
            poster_path: poster ? poster.replace('https://image.tmdb.org/t/p/w500', '') : null,
            vote_average: parseFloat(rating) || 0,
            release_date: year || ''
        };
    }

    // ========== AUTOCOMPLETE ENHANCEMENT ==========
    setupAutocomplete() {
        const input = document.getElementById('movieInput');
        if (!input) return;

        let debounceTimeout;
        
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                this.handleAutocompleteInput(e.target.value);
            }, 300);
        });
    }

    async handleAutocompleteInput(query) {
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        try {
            const response = await fetch(`/api/titles?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            this.showAutocomplete(suggestions);
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }

    showAutocomplete(suggestions) {
        let dropdown = document.getElementById('autocomplete-list');
        if (!dropdown) return;

        if (suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        dropdown.innerHTML = suggestions.slice(0, 8).map(suggestion => `
            <div class="autocomplete-item" onclick="netflixApp.selectSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                <span class="match">${suggestion}</span>
                <span class="item-icon">🎬</span>
            </div>
        `).join('');

        dropdown.classList.remove('hidden');
    }

    hideAutocomplete() {
        const dropdown = document.getElementById('autocomplete-list');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    selectSuggestion(title) {
        const input = document.getElementById('movieInput');
        if (input) {
            input.value = title;
            this.hideAutocomplete();
        }
    }

    // ========== MOBILE OPTIMIZATIONS ==========
    setupMobileOptimizations() {
        // Touch event handlers for swipe gestures
        if ('ontouchstart' in window) {
            this.setupSwipeGestures();
        }
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustLayoutForOrientation();
            }, 100);
        });
    }

    setupSwipeGestures() {
        const movieRows = document.querySelectorAll('.movie-row');
        
        movieRows.forEach(row => {
            let startX = 0;
            let scrollLeft = 0;
            
            row.addEventListener('touchstart', (e) => {
                startX = e.touches[0].pageX - row.offsetLeft;
                scrollLeft = row.scrollLeft;
            });
            
            row.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const x = e.touches[0].pageX - row.offsetLeft;
                const walk = (x - startX) * 2;
                row.scrollLeft = scrollLeft - walk;
            });
        });
    }

    adjustLayoutForOrientation() {
        // Adjust grid columns based on orientation
        const grids = document.querySelectorAll('.movie-grid');
        grids.forEach(grid => {
            if (window.innerHeight > window.innerWidth) {
                // Portrait mode
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
            } else {
                // Landscape mode
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
            }
        });
    }

    // ========== HELPER FUNCTIONS ==========
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    showLoadingIndicator() {
        let indicator = document.getElementById('infiniteScrollLoader');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'infiniteScrollLoader';
            indicator.className = 'infinite-scroll-loader';
            indicator.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Loading more movies...</p>
            `;
            document.body.appendChild(indicator);
        }
        indicator.classList.remove('hidden');
    }

    hideLoadingIndicator() {
        const indicator = document.getElementById('infiniteScrollLoader');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    showNoMoreResults() {
        const grid = document.querySelector('.movie-grid');
        if (grid && !document.getElementById('noMoreResults')) {
            const message = document.createElement('div');
            message.id = 'noMoreResults';
            message.className = 'no-more-results';
            message.innerHTML = `
                <div class="end-message">
                    <span class="end-icon">🎬</span>
                    <p>You've reached the end of recommendations!</p>
                    <button class="netflix-btn btn-secondary" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
                        Back to Top
                    </button>
                </div>
            `;
            grid.parentElement.appendChild(message);
        }
    }

    showErrorMessage(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">⚠️</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // ========== CAST MODAL FUNCTIONALITY ==========
    setupCastModal() {
        // Create cast modal if it doesn't exist
        if (!document.getElementById('castModal')) {
            const modalHTML = `
                <div id="castModal" class="cast-modal hidden">
                    <div class="modal-backdrop" onclick="netflixApp.closeCastModal()"></div>
                    <div class="modal-content cast-modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Cast Information</h3>
                            <button class="modal-close" onclick="netflixApp.closeCastModal()">✕</button>
                        </div>
                        <div class="cast-modal-body">
                            <div class="cast-member-details">
                                <div class="cast-member-photo">
                                    <img id="castMemberImage" src="" alt="">
                                </div>
                                <div class="cast-member-info">
                                    <h4 id="castMemberName"></h4>
                                    <p id="castMemberCharacter"></p>
                                    <div class="cast-member-stats">
                                        <span id="castMemberPopularity"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    showCastModal(actor) {
        this.setupCastModal();
        
        const modal = document.getElementById('castModal');
        const image = document.getElementById('castMemberImage');
        const name = document.getElementById('castMemberName');
        const character = document.getElementById('castMemberCharacter');
        const popularity = document.getElementById('castMemberPopularity');
        
        // Set actor information
        name.textContent = actor.name;
        character.textContent = actor.character ? `as ${actor.character}` : '';
        popularity.textContent = `Popularity: ${actor.popularity ? actor.popularity.toFixed(1) : 'N/A'}`;
        
        if (actor.profile_path) {
            image.src = `https://image.tmdb.org/t/p/w300${actor.profile_path}`;
            image.alt = actor.name;
        } else {
            image.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzMzIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE0MCIgcj0iNTAiIGZpbGw9IiM1NTUiLz4KPHBhdGggZD0iTTEwMCAzMDBDMTAwIDMwMCAxMDAgMjUwIDE1MCAyNTBDMjAwIDI1MCAyMDAgMzAwIDIwMCAzMDBIMzAwVjQ1MEgwVjMwMEgxMDBaIiBmaWxsPSIjNTU1Ii8+Cjwvc3ZnPgo=';
            image.alt = 'No image available';
        }
        
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeCastModal() {
        const modal = document.getElementById('castModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        }
    }

    // Placeholder functions for future features
    addToWatchlist(movieId) {
        console.log('Add to watchlist:', movieId);
        this.showSuccessMessage('Added to your watchlist!');
    }

    likeMovie(movieId) {
        console.log('Like movie:', movieId);
        this.showSuccessMessage('Thanks for your feedback!');
    }

    showSuccessMessage(message, type = 'success') {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `enhanced-toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.success}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // Enhanced loading states
    showLoadingState(element) {
        if (element) {
            element.classList.add('loading');
            const skeleton = document.createElement('div');
            skeleton.className = 'content-skeleton skeleton-card';
            element.appendChild(skeleton);
        }
    }

    hideLoadingState(element) {
        if (element) {
            element.classList.remove('loading');
            const skeleton = element.querySelector('.content-skeleton');
            if (skeleton) skeleton.remove();
        }
    }

    // Progressive image loading with blur effect
    setupProgressiveImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => {
            imageObserver.observe(img);
            img.classList.add('lazy');
        });
    }

    // Enhanced search with debouncing and visual feedback
    setupEnhancedSearch() {
        const searchInput = document.querySelector('#search-input, .search-input');
        if (searchInput && !searchInput.classList.contains('enhanced-setup')) {
            searchInput.classList.add('enhanced-setup');
            
            // Add enhanced styling
            searchInput.classList.add('search-input-enhanced');
            
            // Add search icon
            const icon = document.createElement('span');
            icon.className = 'search-icon-enhanced';
            icon.innerHTML = '🔍';
            searchInput.parentNode.appendChild(icon);
            
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                // Visual feedback for typing
                if (query.length > 0) {
                    searchInput.style.borderColor = 'var(--accent)';
                    icon.style.color = 'var(--accent)';
                } else {
                    searchInput.style.borderColor = 'var(--border)';
                    icon.style.color = 'var(--text-secondary)';
                }
                
                // Debounced search
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        this.performEnhancedSearch(query);
                    }
                }, 300);
            });
        }
    }

    async performEnhancedSearch(query) {
        const resultsContainer = document.querySelector('.movie-grid, .search-results');
        if (resultsContainer) {
            this.showLoadingState(resultsContainer);
            
            try {
                // Your existing search logic here
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
                this.hideLoadingState(resultsContainer);
                this.showSuccessMessage(`Found results for "${query}"`, 'info');
            } catch (error) {
                this.hideLoadingState(resultsContainer);
                this.showSuccessMessage('Search failed. Please try again.', 'error');
            }
        }
    }
}

// Initialize the enhanced app
let netflixApp;

document.addEventListener('DOMContentLoaded', () => {
    netflixApp = new NetflixEnhancedApp();
    
    // Set current movie for recommendations page
    const urlParams = new URLSearchParams(window.location.search);
    const movie = urlParams.get('movie') || document.querySelector('[data-searched-movie]')?.dataset.searchedMovie;
    if (movie) {
        netflixApp.currentMovie = movie;
    }
});

// Add accessibility and keyboard navigation methods to the class prototype
NetflixEnhancedApp.prototype.setupAccessibility = function() {
    // Add ARIA labels and roles
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach((card, index) => {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View details for movie ${index + 1}`);
        
        // Add keyboard event listeners
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    this.setupFocusManagement();
    this.setupHighContrastMode();
    this.setupScreenReaderSupport();
};

NetflixEnhancedApp.prototype.setupFocusManagement = function() {
    const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => {
            element.style.outline = '2px solid var(--accent)';
            element.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', () => {
            element.style.outline = '';
            element.style.outlineOffset = '';
        });
    });
};

NetflixEnhancedApp.prototype.setupKeyboardNavigation = function() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.closeTrailer();
            this.closeCastModal();
        }
        
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            this.handleArrowKeyNavigation(e);
        }
    });
};

NetflixEnhancedApp.prototype.handleArrowKeyNavigation = function(e) {
    const focusedElement = document.activeElement;
    const movieCards = Array.from(document.querySelectorAll('.movie-card'));
    const currentIndex = movieCards.indexOf(focusedElement);
    
    if (currentIndex !== -1) {
        e.preventDefault();
        let newIndex;
        
        switch (e.key) {
            case 'ArrowLeft': newIndex = Math.max(0, currentIndex - 1); break;
            case 'ArrowRight': newIndex = Math.min(movieCards.length - 1, currentIndex + 1); break;
            case 'ArrowUp': newIndex = Math.max(0, currentIndex - 4); break;
            case 'ArrowDown': newIndex = Math.min(movieCards.length - 1, currentIndex + 4); break;
        }
        
        if (movieCards[newIndex]) {
            movieCards[newIndex].focus();
        }
    }
};

NetflixEnhancedApp.prototype.setupHighContrastMode = function() {
    if (window.matchMedia('(prefers-contrast: high)').matches) {
        document.body.classList.add('high-contrast');
    }
    
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.matches);
    });
};

NetflixEnhancedApp.prototype.setupScreenReaderSupport = function() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
};

NetflixEnhancedApp.prototype.announceToScreenReader = function(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => liveRegion.textContent = '', 1000);
    }
};

// Export for legacy compatibility
window.netflixApp = netflixApp;