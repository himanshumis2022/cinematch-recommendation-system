# CineMatch Movie Recommendation System - Use Case & Data Flow Documentation

## Use Case Diagrams Documentation

### Primary Actors
1. **User** - End user who searches for movies and gets recommendations
2. **TMDB API** - External system providing movie data
3. **System Administrator** - Maintains and monitors the application

---

## USE CASE DIAGRAM 1: CORE FUNCTIONALITY

```
                    ┌─────────────────────────────────┐
                    │        CineMatch System         │
                    │                                 │
     ┌─────┐        │  ┌─────────────────────────┐   │        ┌──────────┐
     │     │        │  │    Search Movies        │   │        │          │
     │     │──────────▶│   (UC-001)              │   │◀────────│          │
     │     │        │  └─────────────────────────┘   │        │          │
     │     │        │                                 │        │          │
     │     │        │  ┌─────────────────────────┐   │        │   TMDB   │
     │User │        │  │  Get Recommendations    │   │        │    API   │
     │     │──────────▶│   (UC-002)              │   │◀────────│          │
     │     │        │  └─────────────────────────┘   │        │          │
     │     │        │                                 │        │          │
     │     │        │  ┌─────────────────────────┐   │        │          │
     │     │──────────▶│   View Movie Details   │   │◀────────│          │
     │     │        │  │   (UC-003)              │   │        │          │
     └─────┘        │  └─────────────────────────┘   │        └──────────┘
                    │                                 │
                    │  ┌─────────────────────────┐   │
                    │  │   Apply Filters         │   │
                    │  │   (UC-004)              │   │
                    │  └─────────────────────────┘   │
                    │                                 │
                    │  ┌─────────────────────────┐   │
                    │  │  Watch Movie Trailer    │   │
                    │  │   (UC-005)              │   │
                    │  └─────────────────────────┘   │
                    │                                 │
                    └─────────────────────────────────┘
```

---

## DETAILED USE CASES

### UC-001: Search Movies
**Actor:** User
**Description:** User searches for movies by title
**Preconditions:** User is on the application homepage
**Postconditions:** Search results are displayed

**Main Flow:**
1. User enters movie title in search box
2. System shows autocomplete suggestions
3. User selects a movie or presses enter
4. System queries TMDB API for matching movies
5. System displays search results with movie cards
6. User can click on any movie for more details

**Alternative Flows:**
- 3a. No autocomplete suggestions available
  - 3a1. User types complete title and searches
  - 3a2. System searches without suggestions
- 4a. API request fails
  - 4a1. System shows error message
  - 4a2. User can retry search

**Exception Flows:**
- E1. Network connectivity issues
- E2. Invalid search query
- E3. API rate limit exceeded

### UC-002: Get Movie Recommendations
**Actor:** User
**Description:** User gets movie recommendations based on selected movie
**Preconditions:** User has searched for a movie

**Main Flow:**
1. User views a movie from search results
2. System retrieves movie details from TMDB API
3. System calculates similarity scores with other movies
4. System applies recommendation algorithm
5. System displays recommended movies in grid layout
6. User can scroll to load more recommendations (infinite scroll)

**Business Rules:**
- Recommendations based on genre similarity, cast overlap, and user ratings
- Maximum 24 recommendations per page
- Similar movies are excluded from recommendations

### UC-003: View Movie Details
**Actor:** User
**Description:** User views detailed information about a specific movie

**Main Flow:**
1. User clicks on a movie card
2. System navigates to movie details page
3. System fetches comprehensive movie data from TMDB API
4. System displays movie poster, title, overview, and metadata
5. System shows cast information with photos
6. System provides trailer access button
7. User can view cast details or watch trailer

**Included Use Cases:**
- UC-005: Watch Movie Trailer
- UC-006: View Cast Information

### UC-004: Apply Filters
**Actor:** User
**Description:** User filters movie recommendations using various criteria

**Main Flow:**
1. User accesses filter panel
2. User selects filter criteria (genre, year, rating)
3. System applies filters to current recommendation list
4. System updates display with filtered results
5. User can clear filters or apply additional filters

**Filter Options:**
- Genre: Action, Comedy, Drama, Horror, etc.
- Release Year: Range selector
- Rating: Minimum IMDB rating
- Runtime: Duration range

### UC-005: Watch Movie Trailer
**Actor:** User
**Description:** User watches movie trailer in embedded player

**Main Flow:**
1. User clicks "Watch Trailer" button
2. System queries TMDB API for trailer data
3. System opens video modal with YouTube embed
4. User watches trailer
5. User can close modal to return to movie details

**Alternative Flows:**
- 2a. No trailer available
  - 2a1. System shows "Trailer not available" message
  - 2a2. Button is disabled

---

## USE CASE DIAGRAM 2: ADMIN FUNCTIONALITY

```
                    ┌─────────────────────────────────┐
                    │      Admin Operations           │
                    │                                 │
┌──────────────┐    │  ┌─────────────────────────┐   │
│              │    │  │   Monitor System        │   │
│   System     │──────▶│   Performance           │   │
│Administrator │    │  │   (UC-101)              │   │
│              │    │  └─────────────────────────┘   │
│              │    │                                 │
│              │    │  ┌─────────────────────────┐   │
└──────────────┘    │  │   Manage API Keys       │   │
                    │  │   (UC-102)              │   │
                    │  └─────────────────────────┘   │
                    │                                 │
                    │  ┌─────────────────────────┐   │
                    │  │   View System Logs      │   │
                    │  │   (UC-103)              │   │
                    │  └─────────────────────────┘   │
                    │                                 │
                    └─────────────────────────────────┘
```

---

## DATA FLOW DIAGRAMS

### Level 0: Context Diagram
```
                     ┌─────────────────────────┐
                     │                         │
                     │     CineMatch Movie     │
         User ───────▶│   Recommendation       │◀────── TMDB API
                     │       System            │
                     │                         │
                     └─────────────────────────┘
                                │
                                ▼
                        Search Results &
                        Recommendations
```

### Level 1: System Overview Data Flow
```
                 ┌─────────────────────────────────────────────┐
                 │              CineMatch System                │
                 │                                             │
     User Query  │   ┌─────────┐    Movie Data    ┌─────────┐ │  API Request
    ─────────────┼──▶│ Search  │─────────────────▶│ Recommend│ │─────────────▶
                 │   │ Module  │                  │ Engine   │ │              TMDB
                 │   └─────────┘                  └─────────┘ │◀─────────────
                 │        │                           │       │  Movie Data
                 │        ▼                           ▼       │
                 │   ┌─────────┐                 ┌─────────┐ │
                 │   │ Display │◀────────────────│  Data   │ │
                 │   │ Module  │   Formatted     │Process  │ │
                 │   └─────────┘   Results       └─────────┘ │
                 │        │                                   │
                 └────────┼───────────────────────────────────┘
                          ▼
                   Formatted Movie
                   Recommendations
```

### Level 2: Detailed Data Flow - Search Process
```
┌─────────────────────────────────────────────────────────────────┐
│                    Search Process Detail                        │
│                                                                 │
│ User Input     ┌──────────────┐    Validated    ┌─────────────┐│
│ ─────────────▶ │   Input      │    Query        │   Query     ││
│                │ Validation   │ ──────────────▶ │ Processing  ││
│                └──────────────┘                 └─────────────┘│
│                       │                               │         │
│                       ▼                               ▼         │
│                 Error Message                  ┌─────────────┐ │
│                                               │  TMDB API   │ │
│                                               │  Interface  │ │
│                                               └─────────────┘ │
│                                                      │         │
│                                                      ▼         │
│                ┌─────────────┐    Raw Data    ┌─────────────┐ │
│                │   Result    │ ◀──────────────│    Data     │ │
│                │ Formatting  │                │ Processing  │ │
│                └─────────────┘                └─────────────┘ │
│                       │                                       │
│                       ▼                                       │
│                 Formatted Results                             │
└─────────────────────────────────────────────────────────────────┘
```

### Level 2: Detailed Data Flow - Recommendation Engine
```
┌─────────────────────────────────────────────────────────────────┐
│                Recommendation Engine Detail                     │
│                                                                 │
│ Selected Movie ┌──────────────┐   Movie Features ┌───────────┐ │
│ ─────────────▶ │   Feature    │ ──────────────▶  │ Similarity│ │
│                │  Extraction  │                  │Calculator │ │
│                └──────────────┘                  └───────────┘ │
│                                                        │       │
│                ┌──────────────┐   All Movies           ▼       │
│                │   Movie      │   Database       ┌───────────┐ │
│                │  Database    │ ──────────────▶  │  Ranking  │ │
│                └──────────────┘                  │ Algorithm │ │
│                                                  └───────────┘ │
│                                                        │       │
│                                                        ▼       │
│                ┌──────────────┐   Filtered       ┌───────────┐ │
│                │   Filter     │   Results        │   Top-N   │ │
│                │  Application │ ◀────────────────│ Selection │ │
│                └──────────────┘                  └───────────┘ │
│                       │                                       │
│                       ▼                                       │
│                Final Recommendations                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ACTIVITY DIAGRAMS

### Movie Search Activity Flow
```
         Start
           │
           ▼
    ┌─────────────┐
    │ Enter Search│
    │    Query    │
    └─────────────┘
           │
           ▼
    ┌─────────────┐    No     ┌─────────────┐
    │  Valid      │─────────▶ │ Show Error  │
    │  Query?     │           │   Message   │
    └─────────────┘           └─────────────┘
           │ Yes                      │
           ▼                          ▼
    ┌─────────────┐              ┌─────────────┐
    │ Query TMDB  │              │    Retry    │
    │     API     │              │   Search    │
    └─────────────┘              └─────────────┘
           │                          │
           ▼                          │
    ┌─────────────┐                   │
    │   Process   │                   │
    │   Results   │                   │
    └─────────────┘                   │
           │                          │
           ▼                          │
    ┌─────────────┐                   │
    │   Display   │                   │
    │  Movie List │                   │
    └─────────────┘                   │
           │                          │
           ▼                          │
    ┌─────────────┐                   │
    │ Select Movie│                   │
    │ for Details │                   │
    └─────────────┘                   │
           │                          │
           ▼                          │
         End ◀─────────────────────────┘
```

### Recommendation Generation Activity Flow
```
         Start
           │
           ▼
    ┌─────────────┐
    │  Get Movie  │
    │  Features   │
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │ Calculate   │
    │ Similarity  │
    │  Scores     │
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   Rank      │
    │   Movies    │
    └─────────────┘
           │
           ▼
    ┌─────────────┐    Apply    ┌─────────────┐
    │   Filters   │   Filters?  │   Apply     │
    │  Available? │────Yes─────▶│   Filters   │
    └─────────────┘             └─────────────┘
           │ No                        │
           ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │   Select    │             │   Filter    │
    │   Top-N     │             │   Results   │
    └─────────────┘             └─────────────┘
           │                           │
           ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │   Format    │◀────────────│   Select    │
    │   Results   │             │   Top-N     │
    └─────────────┘             └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   Display   │
    │Recommendations│
    └─────────────┘
           │
           ▼
         End
```

---

## SEQUENCE DIAGRAMS

### Movie Search Sequence
```
User          Frontend       Backend        TMDB API
 │               │              │              │
 │──Search Query─▶│              │              │
 │               │──Validate────▶│              │
 │               │              │──API Request─▶│
 │               │              │              │
 │               │              │◀─Movie Data──│
 │               │◀─Results─────│              │
 │◀─Display──────│              │              │
 │               │              │              │
```

### Recommendation Generation Sequence
```
User          Frontend       Backend      Algorithm    TMDB API
 │               │              │             │           │
 │──Select Movie─▶│              │             │           │
 │               │──Get Recs────▶│             │           │
 │               │              │──Extract────▶│           │
 │               │              │   Features   │           │
 │               │              │             │           │
 │               │              │──Get Similar─▶│           │
 │               │              │   Movies     │           │
 │               │              │             │           │
 │               │              │──Details────────────────▶│
 │               │              │   Request    │           │
 │               │              │             │           │
 │               │              │◀─Movie──────────────────│
 │               │              │   Details    │           │
 │               │◀─Formatted───│             │           │
 │               │   Results    │             │           │
 │◀─Display──────│              │             │           │
 │               │              │             │           │
```

---

## STATE DIAGRAMS

### Application State Diagram
```
                    ┌─────────────┐
             ┌─────▶│   Initial   │
             │      │   Loading   │
             │      └─────────────┘
             │             │
             │             ▼
             │      ┌─────────────┐      Search Query
             │      │    Ready    │──────────────────┐
             │      │  (Homepage) │                  │
             │      └─────────────┘                  ▼
             │             ▲                ┌─────────────┐
             │             │                │ Searching   │
             │             │                │ (Loading)   │
             │      Back/Reset              └─────────────┘
             │             │                        │
             │             │                Results │
             │             │                        ▼
             │      ┌─────────────┐           ┌─────────────┐
             │      │   Movie     │    View   │   Search    │
             │      │   Details   │◀─Details──│   Results   │
             │      └─────────────┘           └─────────────┘
             │             │                        │
             │      Get Recommendations      Select Movie
             │             │                        │
             │             ▼                        │
             │      ┌─────────────┐                 │
             └──────│Recommendations│◀───────────────┘
                    │  (Generated) │
                    └─────────────┘
```

### Movie Card State Diagram
```
           ┌─────────────┐
           │   Loading   │
           │    State    │
           └─────────────┘
                  │
           Image Load Complete
                  │
                  ▼
           ┌─────────────┐
           │   Normal    │────Hover───┐
           │    State    │            │
           └─────────────┘            ▼
                  ▲            ┌─────────────┐
                  │            │   Hover     │
            Mouse Leave        │    State    │
                  │            └─────────────┘
                  └─────────────────┘
```

---

## DATA DICTIONARY

### Core Data Entities

#### Movie Entity
```
Movie {
    id: Integer (Primary Key)
    title: String (255)
    overview: Text
    release_date: Date
    poster_path: String (500)
    backdrop_path: String (500)
    vote_average: Float
    vote_count: Integer
    genre_ids: Array[Integer]
    runtime: Integer
    original_language: String (10)
    popularity: Float
    adult: Boolean
}
```

#### Cast Entity
```
Cast {
    id: Integer (Primary Key)
    name: String (255)
    character: String (255)
    profile_path: String (500)
    order: Integer
    gender: Integer
    known_for_department: String (100)
}
```

#### Recommendation Entity
```
Recommendation {
    source_movie_id: Integer
    recommended_movie_id: Integer
    similarity_score: Float
    algorithm_used: String (50)
    created_at: DateTime
}
```

---

**Document Information:**
- **Version:** 1.0
- **Created:** November 17, 2025
- **Purpose:** Technical documentation for use cases and data flows
- **Audience:** Development team, stakeholders, testers
- **Review Status:** In Progress