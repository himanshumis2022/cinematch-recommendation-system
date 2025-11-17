// Enhanced UI State Management
class UIState {
  constructor() {
    this.isLoading = false;
    this.currentSearch = '';
    this.searchCache = new Map();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.updateLoadingUI();
  }

  updateLoadingUI() {
    const btn = document.getElementById('searchBtn');
    const spinner = document.getElementById('spinner');
    const input = document.getElementById('movieInput');
    
    if (btn) {
      btn.disabled = this.isLoading;
      btn.innerHTML = this.isLoading ? 
        '<span class="spinner-sm"></span> Searching...' : 
        '🔍 Find Movies';
      btn.style.opacity = this.isLoading ? '0.7' : '1';
    }
    
    if (spinner) {
      spinner.classList.toggle('hidden', !this.isLoading);
      spinner.setAttribute('aria-hidden', !this.isLoading);
    }
    
    if (input) {
      input.disabled = this.isLoading;
    }
  }
}

const uiState = new UIState();

// Enhanced form submission with loading states
function onSubmit() {
  uiState.setLoading(true);
  
  // Add visual feedback
  const form = document.getElementById('searchForm');
  if (form) {
    form.style.transform = 'scale(0.98)';
    setTimeout(() => {
      form.style.transform = 'scale(1)';
    }, 150);
  }
  
  // Reset loading state after a timeout (fallback)
  setTimeout(() => {
    uiState.setLoading(false);
  }, 10000);
}

// Enhanced page load handling
window.addEventListener('load', () => {
  uiState.setLoading(false);
  
  // Add fade-in animation to main content
  const main = document.querySelector('main');
  if (main) {
    main.style.opacity = '0';
    main.style.transform = 'translateY(20px)';
    setTimeout(() => {
      main.style.transition = 'all 0.6s ease';
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';
    }, 100);
  }
  
  // Initialize interactive elements
  initializeInteractions();
});

// Initialize interactive elements
function initializeInteractions() {
  console.log('Initializing interactions...');
  
  const input = document.getElementById('movieInput');
  if (input) {
    console.log('Found movieInput element');
    // Set up input event listeners
    input.addEventListener('input', handleInputChange);
    input.addEventListener('focus', handleInputFocus);
    input.addEventListener('blur', handleInputBlur);
    
    // Test the initial datalist
    const datalist = document.getElementById('movieTitles');
    if (datalist) {
      const options = datalist.querySelectorAll('option');
      console.log(`Found datalist with ${options.length} options`);
    } else {
      console.error('movieTitles datalist not found!');
    }
  } else {
    console.error('movieInput element not found!');
  }
  
  // Initialize form submission
  const form = document.getElementById('searchForm');
  if (form) {
    console.log('Found searchForm element');
    form.addEventListener('submit', onSubmit);
  } else {
    console.error('searchForm element not found!');
  }
  
  // Test autocomplete list
  const dropdown = document.getElementById('autocomplete-list');
  if (dropdown) {
    console.log('Found autocomplete-list element');
  } else {
    console.error('autocomplete-list element not found!');
  }
}

// Handle input changes
function handleInputChange(e) {
  console.log('Input changed:', e.target.value);
  updateDatalist();
  
  // Add visual feedback
  const input = e.target;
  input.classList.add('typing');
  setTimeout(() => {
    input.classList.remove('typing');
  }, 500);
}

// Handle input focus
function handleInputFocus(e) {
  const dropdown = document.getElementById('autocomplete-list');
  if (dropdown && e.target.value.trim().length >= 2) {
    updateDatalist();
  }
}

// Handle input blur
function handleInputBlur(e) {
  // Delay hiding dropdown to allow clicks
  setTimeout(() => {
    const dropdown = document.getElementById('autocomplete-list');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }, 200);
}

// Utility functions
function debounce(fn, wait) {
  let timeout = null;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Enhanced autocomplete with caching and loading states
async function fetchSuggestions(query) {
  console.log('fetchSuggestions called with query:', query);
  
  if (!query || query.length < 2) {
    console.log('Query too short, returning empty array');
    return [];
  }
  
  // Check cache first
  if (uiState.searchCache.has(query)) {
    console.log('Returning cached results for:', query);
    return uiState.searchCache.get(query);
  }
  
  try {
    const url = `/api/titles?q=${encodeURIComponent(query)}`;
    console.log('Fetching from URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API returned data:', data);
    
    // Cache the results
    uiState.searchCache.set(query, data);
    
    // Limit cache size
    if (uiState.searchCache.size > 50) {
      const firstKey = uiState.searchCache.keys().next().value;
      uiState.searchCache.delete(firstKey);
    }
    
    return data;
  } catch (error) {
    console.error('Search suggestions failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return [];
  }
}

// Enhanced datalist updates with loading indicators
const updateDatalist = debounce(async function() {
  const input = document.getElementById('movieInput');
  const list = document.getElementById('movieTitles');
  
  console.log('updateDatalist called');
  
  if (!input) {
    console.error('Input element movieInput not found');
    return;
  }
  
  if (!list) {
    console.error('Datalist element movieTitles not found');
    return;
  }
  
  const query = input.value.trim();
  uiState.currentSearch = query;
  
  console.log('Query:', query);
  
  if (query.length < 2) {
    populateDropdown([]);
    return;
  }
  
  // Show loading state in dropdown
  showDropdownLoading();
  
  try {
    // Try API first
    const suggestions = await fetchSuggestions(query);
    
    console.log('Got suggestions:', suggestions);
    
    // Only update if this is still the current search
    if (uiState.currentSearch === query) {
      if (suggestions && suggestions.length > 0) {
        // Update datalist
        list.innerHTML = '';
        suggestions.forEach(suggestion => {
          const option = document.createElement('option');
          option.value = suggestion;
          list.appendChild(option);
        });
        
        // Update custom dropdown
        populateDropdown(suggestions);
      } else {
        // Fallback: search existing datalist options
        const fallbackSuggestions = getFallbackSuggestions(query);
        console.log('Using fallback suggestions:', fallbackSuggestions);
        populateDropdown(fallbackSuggestions);
      }
    }
  } catch (error) {
    console.error('Error updating suggestions:', error);
    // Try fallback suggestions
    const fallbackSuggestions = getFallbackSuggestions(query);
    populateDropdown(fallbackSuggestions);
  }
}, 300);

// Fallback suggestion system using existing datalist
function getFallbackSuggestions(query) {
  console.log('Getting fallback suggestions for:', query);
  const list = document.getElementById('movieTitles');
  if (!list) {
    console.error('movieTitles datalist not found for fallback');
    return [];
  }
  
  const options = Array.from(list.querySelectorAll('option'));
  console.log(`Found ${options.length} options in datalist`);
  
  const lowerQuery = query.toLowerCase();
  
  const matches = options
    .map(option => option.value)
    .filter(title => title.toLowerCase().includes(lowerQuery))
    .slice(0, 8);
    
  console.log(`Fallback suggestions found ${matches.length} matches:`, matches);
  return matches;
}

// Input handling is now done in initializeInteractions()

// Enhanced dropdown with loading states and animations
function showDropdownLoading() {
  const dropdown = document.getElementById('autocomplete-list');
  if (!dropdown) {
    console.warn('Autocomplete dropdown not found');
    return;
  }
  
  dropdown.innerHTML = `
    <div class="autocomplete-loading" style="padding: 1rem; text-align: center; color: var(--text-secondary);">
      <span class="spinner-sm"></span>
      <span>Searching movies...</span>
    </div>
  `;
  dropdown.classList.remove('hidden');
  dropdown.style.display = 'block';
}

function populateDropdown(items) {
  const dropdown = document.getElementById('autocomplete-list');
  const input = document.getElementById('movieInput');
  
  console.log('populateDropdown called with:', items);
  
  if (!dropdown) {
    console.error('Dropdown element not found');
    return;
  }
  
  if (!input) {
    console.error('Input element not found');
    return;
  }
  
  dropdown.innerHTML = '';
  
  if (!items || items.length === 0) {
    if (input.value.trim().length >= 2) {
      dropdown.innerHTML = `
        <div class="autocomplete-empty" style="padding: 1rem; text-align: center; color: var(--text-secondary);">
          <span style="font-size: 1.5rem;">🎬</span>
          <div style="margin-top: 0.5rem;">No movies found for "${escapeHtml(input.value.trim())}"</div>
        </div>
      `;
      dropdown.classList.remove('hidden');
      dropdown.style.display = 'block';
    } else {
      dropdown.classList.add('hidden');
      dropdown.style.display = 'none';
    }
    return;
  }
  
  const query = input.value.trim().toLowerCase();
  
  items.slice(0, 8).forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.setAttribute('role', 'option');
    div.setAttribute('data-value', item);
    div.setAttribute('tabindex', '-1');
    div.style.cssText = `
      padding: 1rem 1.5rem;
      cursor: pointer;
      border-bottom: 1px solid var(--border-light);
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    // Highlight matching text
    const highlightedText = highlightMatch(item, query);
    div.innerHTML = `
      <span class="match" style="flex: 1;">${highlightedText}</span>
      <span class="item-icon" style="margin-left: 0.5rem;">🎬</span>
    `;
    
    // Enhanced interaction handlers
    div.addEventListener('mousedown', (event) => {
      event.preventDefault();
      selectItem(item);
    });
    
    div.addEventListener('mouseenter', () => {
      div.style.background = 'rgba(255, 0, 128, 0.1)';
      div.style.borderLeft = '3px solid var(--accent)';
      div.style.transform = 'translateX(5px)';
    });
    
    div.addEventListener('mouseleave', () => {
      div.style.background = '';
      div.style.borderLeft = '';
      div.style.transform = '';
    });
    
    dropdown.appendChild(div);
  });
  
  dropdown.classList.remove('hidden');
  dropdown.style.display = 'block';
  dropdown.dataset.active = '-1';
  
  console.log('Dropdown populated with', items.length, 'items');
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return escapedText.replace(regex, '<mark>$1</mark>');
}

function selectItem(value) {
  const input = document.getElementById('movieInput');
  const dropdown = document.getElementById('autocomplete-list');
  
  if (input) {
    input.value = value;
    input.focus();
    
    // Add selection feedback
    input.style.background = 'var(--accent-light)';
    setTimeout(() => {
      input.style.background = '';
    }, 300);
  }
  
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enhanced keyboard navigation with better UX
window.addEventListener('keydown', (e) => {
  const dropdown = document.getElementById('autocomplete-list');
  const input = document.getElementById('movieInput');
  
  if (!dropdown || !input) return;
  if (dropdown.classList.contains('hidden')) return;
  
  let active = parseInt(dropdown.dataset.active || '-1', 10);
  const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      active = active < items.length - 1 ? active + 1 : 0; // Wrap around
      setActiveItem(active);
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      active = active > 0 ? active - 1 : items.length - 1; // Wrap around
      setActiveItem(active);
      break;
      
    case 'Enter':
      if (active >= 0 && items[active]) {
        e.preventDefault();
        const value = items[active].dataset.value;
        selectItem(value);
        
        // Submit form after brief delay for visual feedback
        setTimeout(() => {
          document.getElementById('searchForm')?.submit();
        }, 150);
      }
      break;
      
    case 'Escape':
      dropdown.classList.add('hidden');
      input.focus();
      break;
      
    case 'Tab':
      // Auto-complete with first suggestion
      if (items.length > 0 && input.value.trim()) {
        e.preventDefault();
        selectItem(items[0].dataset.value);
      }
      break;
  }
});

function setActiveItem(index) {
  const dropdown = document.getElementById('autocomplete-list');
  const items = Array.from(dropdown.querySelectorAll('.autocomplete-item'));
  
  items.forEach((item, i) => {
    if (i === index) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      dropdown.dataset.active = index;
      
      // Add subtle animation
      item.style.transform = 'scale(1.02)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 150);
    } else {
      item.classList.remove('active');
    }
  });
}

// Enhanced click handling with better UX
window.addEventListener('click', (e) => {
  const dropdown = document.getElementById('autocomplete-list');
  const input = document.getElementById('movieInput');
  
  if (!dropdown || !input) return;
  
  // Keep dropdown open when clicking input
  if (e.target === input) {
    if (input.value.trim().length >= 2) {
      updateDatalist();
    }
    return;
  }
  
  // Hide dropdown when clicking outside
  if (!dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

// Initialize interactive features
function initializeInteractions() {
  // Add smooth scrolling to all internal links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // Add hover effects to cards
  document.querySelectorAll('.movie-card, .feature-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
  
  // Add loading animation to images
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) {
      img.style.opacity = '0';
      img.addEventListener('load', function() {
        this.style.transition = 'opacity 0.3s ease';
        this.style.opacity = '1';
      });
    }
  });
  
  // Initialize search input enhancements
  const searchInput = document.getElementById('movieInput');
  if (searchInput) {
    // Add search icon toggle
    searchInput.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    searchInput.addEventListener('blur', function() {
      setTimeout(() => {
        this.parentElement.classList.remove('focused');
      }, 150);
    });
    
    // Add clear button functionality
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-search';
    clearBtn.innerHTML = '✕';
    clearBtn.title = 'Clear search';
    clearBtn.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 1.2rem;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 10;
    `;
    
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      updateClearButtonVisibility();
      populateDropdown([]);
    });
    
    function updateClearButtonVisibility() {
      clearBtn.style.opacity = searchInput.value.trim() ? '1' : '0';
    }
    
    searchInput.addEventListener('input', updateClearButtonVisibility);
    
    if (searchInput.parentElement.style.position !== 'absolute') {
      searchInput.parentElement.style.position = 'relative';
    }
    searchInput.parentElement.appendChild(clearBtn);
    updateClearButtonVisibility();
    
    // Add placeholder animation
    let placeholderIndex = 0;
    const placeholders = [
      'Search for movies...',
      'Try "The Matrix"',
      'Find your next favorite film',
      'Discover amazing movies'
    ];
    
    if (!searchInput.value) {
      setInterval(() => {
        if (!searchInput.value && document.activeElement !== searchInput) {
          searchInput.placeholder = placeholders[placeholderIndex];
          placeholderIndex = (placeholderIndex + 1) % placeholders.length;
        }
      }, 3000);
    }
  }
  
  // Add scroll-to-top functionality
  const scrollBtn = document.createElement('button');
  scrollBtn.innerHTML = '⬆️';
  scrollBtn.className = 'scroll-to-top';
  scrollBtn.title = 'Back to top';
  scrollBtn.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--gradient-primary);
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.3s ease;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
  `;
  
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // Show/hide scroll button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollBtn.style.opacity = '1';
      scrollBtn.style.transform = 'scale(1)';
    } else {
      scrollBtn.style.opacity = '0';
      scrollBtn.style.transform = 'scale(0.8)';
    }
  });
  
  document.body.appendChild(scrollBtn);
}

// Add some CSS for enhanced animations (injected via JavaScript)
const enhancedStyles = document.createElement('style');
enhancedStyles.textContent = `
  .spinner-sm {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .typing {
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.3) !important;
  }
  
  .autocomplete-loading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  
  .autocomplete-empty {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-style: italic;
  }
  
  .autocomplete-item mark {
    background: var(--accent-light);
    color: var(--accent);
    padding: 0.1em 0.2em;
    border-radius: 0.2em;
  }
  
  .autocomplete-item .item-icon {
    opacity: 0.6;
    font-size: 0.9rem;
  }
  
  .focused {
    transform: scale(1.02);
  }
  
  .clear-search:hover {
    color: var(--accent) !important;
    transform: translateY(-50%) scale(1.1);
  }
`;

document.head.appendChild(enhancedStyles);
