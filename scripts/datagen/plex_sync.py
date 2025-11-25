"""
Plex API Sync Script - Proof of Concept
This replaces the Tautulli export approach with direct Plex API calls.

Requirements:
    pip install plexapi pillow

Environment Variables:
    PLEX_URL: Your Plex server URL (e.g., http://192.168.1.100:32400)
    PLEX_TOKEN: Your Plex authentication token
    PLEX_LIBRARY_NAMES: Comma-separated library names (e.g., "Movies,TV Shows,Music")
"""

import os
import json
import requests
import time
from plexapi.server import PlexServer
from plexapi.library import LibrarySection
from plexapi.video import Movie, Show, Season, Episode
from plexapi.audio import Artist, Album, Track
from collections import defaultdict
from PIL import Image
import io

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use environment variables only

# Configuration
PLEX_URL = os.getenv("PLEX_URL")
PLEX_TOKEN = os.getenv("PLEX_TOKEN")
LIBRARY_NAMES = [name.strip() for name in os.getenv("PLEX_LIBRARY_NAMES", "Movies,TV Shows,Music").split(",")]

OUTPUT_DIR = "../../data/gen"
REF_DIR = "../../data"
IMAGE_FOLDERS = {
    "Movies": "../../assets/images/movie_image",
    "TV Shows": "../../assets/images/tv_image",
    "Music": "../../assets/images/music_image"
}

def human_readable_size(total_bytes):
    """Convert bytes to human-readable format."""
    if total_bytes >= 1_000_000_000_000:
        return f"{total_bytes / 1_000_000_000_000:.2f} TB"
    elif total_bytes >= 1_000_000_000:
        return f"{total_bytes / 1_000_000_000:.2f} GB"
    else:
        return f"{total_bytes / 1_000_000:.2f} MB"

def human_readable_duration(total_milliseconds):
    """Convert milliseconds to human-readable duration in full integer minutes."""
    total_seconds = total_milliseconds // 1000
    total_minutes = round(total_seconds / 60)
    # Ensure at least 1 minute if there's any duration
    if total_minutes == 0 and total_seconds > 0:
        total_minutes = 1
    return f"{total_minutes} min{'s' if total_minutes != 1 else ''}"

def format_resolution(resolution):
    """Format resolution string."""
    if resolution is None:
        return None
    resolution = resolution.lower()
    if resolution == "4k":
        return "2160p"
    elif resolution.isdigit():
        return f"{resolution}p"
    return resolution

def format_codec(codec):
    """Format codec string."""
    if codec is None:
        return None
    return codec.upper()

def download_and_convert_image(plex_item, output_path, plex_server, max_retries=3):
    """Download thumbnail from Plex and convert to WebP with retry logic."""
    for attempt in range(max_retries):
        try:
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Get thumbnail URL
            if not plex_item.thumb:
                return False
                
            thumb_url = plex_server.url(plex_item.thumb, includeToken=True)
            
            # Download image with longer timeout
            response = requests.get(thumb_url, timeout=30)
            if response.status_code == 200:
                # Convert to WebP
                img = Image.open(io.BytesIO(response.content))
                # Convert RGBA to RGB if needed
                if img.mode == 'RGBA':
                    rgb_img = Image.new('RGB', img.size, (0, 0, 0))
                    rgb_img.paste(img, mask=img.split()[3])
                    img = rgb_img
                
                # Save as WebP (output_path should already be .webp)
                img.save(output_path, 'WEBP', quality=80)
                return True
        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"  Timeout downloading image, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            else:
                print(f"  Failed to download image after {max_retries} attempts")
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"  Error downloading image, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            else:
                print(f"Error downloading image for {plex_item.title if hasattr(plex_item, 'title') else 'unknown'}: {e}")
    return False

def process_movies(library: LibrarySection, plex_server: PlexServer):
    """Process movies library."""
    print(f"Processing {library.title} library...")
    
    # Fetch movies with retry logic and longer timeout
    movies = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Fetching movies from library (attempt {attempt + 1}/{max_retries})...")
            movies = library.all()
            break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"  Timeout fetching movies, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Failed to fetch movies after {max_retries} attempts: {e}")
                return
    
    if not movies:
        print("❌ No movies retrieved")
        return
    
    total_movies = 0
    total_size_bytes = 0
    simplified_movies = []
    
    image_folder = IMAGE_FOLDERS.get("Movies")
    os.makedirs(image_folder, exist_ok=True)
    
    total_count = len(movies)
    print(f"Found {total_count} movies. Processing...")
    print("Downloading images (this may take a while)...")
    
    images_downloaded = 0
    images_failed = 0
    
    for idx, movie in enumerate(movies, 1):
        try:
            if idx % 50 == 0 or idx == total_count:
                print(f"  Progress: {idx}/{total_count} ({idx*100//total_count}%)")
            
            total_movies += 1
            
            # Get media info
            media = movie.media[0] if movie.media else None
            if not media:
                continue
                
            part = media.parts[0] if media.parts else None
            if not part:
                continue
            
            size_bytes = part.size or 0
            total_size_bytes += size_bytes
            
            # Download and convert thumbnail (always replace to handle rating key changes)
            rating_key = movie.ratingKey
            image_path = os.path.join(image_folder, f"{rating_key}.thumb.webp")
            if download_and_convert_image(movie, image_path, plex_server):
                images_downloaded += 1
            else:
                images_failed += 1
            
            simplified_movies.append({
                "ratingKey": rating_key,
                "title": movie.title,
                "year": movie.year,
                "contentRating": movie.contentRating,
                "durationHuman": human_readable_duration(movie.duration) if movie.duration else None,
                "audioCodec": format_codec(media.audioCodec),
                "container": part.container,
                "videoCodec": format_codec(media.videoCodec),
                "videoResolution": format_resolution(media.videoResolution),
                "sizeHuman": human_readable_size(size_bytes),
            })
        except Exception as e:
            print(f"Error processing movie {movie.title}: {e}")
            continue
    
    metadata = {
        "totalMovies": total_movies,
        "totalSizeHuman": human_readable_size(total_size_bytes)
    }
    
    output_data = {"metadata": metadata, "movies": simplified_movies}
    output_path = os.path.join(REF_DIR, "movies_ref.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4)
    
    print(f"\nProcessed {total_movies} movies. Saved to {output_path}")
    print(f"Images: {images_downloaded} downloaded, {images_failed} failed")

def process_tvshows(library: LibrarySection, plex_server: PlexServer):
    """Process TV shows library."""
    print(f"Processing {library.title} library...")
    
    # Fetch shows with retry logic and longer timeout
    shows = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Fetching shows from library (attempt {attempt + 1}/{max_retries})...")
            shows = library.all()
            break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"  Timeout fetching shows, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Failed to fetch shows after {max_retries} attempts: {e}")
                return
    
    if not shows:
        print("❌ No shows retrieved")
        return
    
    simplified_tvshows = []
    total_shows = 0
    total_seasons = 0
    total_episodes = 0
    total_size_bytes = 0
    
    image_folder = IMAGE_FOLDERS.get("TV Shows")
    os.makedirs(image_folder, exist_ok=True)
    
    total_count = len(shows)
    print(f"Found {total_count} shows. Processing...")
    print("Downloading images (this may take a while)...")
    
    show_images_downloaded = 0
    show_images_failed = 0
    season_images_downloaded = 0
    season_images_failed = 0
    
    for idx, show in enumerate(shows, 1):
        try:
            if idx % 10 == 0 or idx == total_count:
                print(f"  Progress: {idx}/{total_count} ({idx*100//total_count}%)")
            
            total_shows += 1
            show_size_bytes = 0
            show_total_episodes = 0
            show_years = []
            show_video_resolutions = []
            show_audio_codecs = []
            show_video_codecs = []
            show_containers = []
            
            seasons = []
            # Fetch seasons with retry
            seasons_list = None
            for attempt in range(3):
                try:
                    seasons_list = show.seasons()
                    break
                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                    if attempt < 2:
                        time.sleep((attempt + 1) * 2)
                        continue
                    else:
                        print(f"  ⚠️  Failed to fetch seasons for {show.title}, skipping...")
                        seasons_list = []
            
            for season in seasons_list:
                total_seasons += 1
                season_size_bytes = 0
                season_total_episodes = 0
                season_total_duration = 0
                season_years = []
                season_video_resolutions = []
                season_audio_codecs = []
                season_video_codecs = []
                season_containers = []
                
                # Fetch episodes with retry
                episodes_list = None
                for attempt in range(3):
                    try:
                        episodes_list = season.episodes()
                        break
                    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                        if attempt < 2:
                            time.sleep((attempt + 1) * 2)
                            continue
                        else:
                            print(f"  ⚠️  Failed to fetch episodes for season {season.seasonNumber} of {show.title}, skipping...")
                            episodes_list = []
                
                for episode in episodes_list:
                    season_total_episodes += 1
                    show_total_episodes += 1
                    total_episodes += 1
                    
                    # Track episode duration
                    if episode.duration:
                        season_total_duration += episode.duration
                    
                    if episode.media:
                        episode_media = episode.media[0]
                        if episode_media.parts:
                            episode_part = episode_media.parts[0]
                            size_bytes = episode_part.size or 0
                            season_size_bytes += size_bytes
                            show_size_bytes += size_bytes
                            total_size_bytes += size_bytes
                            
                            season_video_resolutions.append(format_resolution(episode_media.videoResolution))
                            season_audio_codecs.append(format_codec(episode_media.audioCodec))
                            season_video_codecs.append(format_codec(episode_media.videoCodec))
                            season_containers.append(episode_part.container)
                            
                            season_years.append(episode.year)
                
                valid_years = [year for year in season_years if year]
                year_range = f"{min(valid_years)}-{max(valid_years)}" if valid_years else None
                
                # Download and convert season thumbnail (always replace to handle rating key changes)
                season_rating_key = season.ratingKey
                season_image_path = os.path.join(image_folder, f"{season_rating_key}.thumb.webp")
                if download_and_convert_image(season, season_image_path, plex_server):
                    season_images_downloaded += 1
                else:
                    season_images_failed += 1
                
                # Calculate average episode duration for the season
                avg_season_duration = season_total_duration // season_total_episodes if season_total_episodes > 0 else 0
                
                season_data = {
                    "seasonRatingKey": season_rating_key,
                    "seasonNumber": season.seasonNumber,
                    "seasonTotalEpisode": season_total_episodes,
                    "avgSeasonEpisodeDuration": human_readable_duration(avg_season_duration) if avg_season_duration > 0 else None,
                    "seasonSizeHuman": human_readable_size(season_size_bytes),
                    "avgSeasonVideoResolution": ", ".join(sorted(set([r for r in season_video_resolutions if r]))),
                    "avgSeasonAudioCodec": ", ".join(sorted(set([c for c in season_audio_codecs if c]))),
                    "avgSeasonVideoCodec": ", ".join(sorted(set([c for c in season_video_codecs if c]))),
                    "avgSeasonContainer": ", ".join(sorted(set([c for c in season_containers if c]))),
                    "yearRange": year_range
                }
                
                show_video_resolutions.extend(season_video_resolutions)
                show_audio_codecs.extend(season_audio_codecs)
                show_video_codecs.extend(season_video_codecs)
                show_containers.extend(season_containers)
                show_years.extend(season_years)
                
                seasons.append(season_data)
            
            # Download and convert show thumbnail (always replace to handle rating key changes)
            rating_key = show.ratingKey
            image_path = os.path.join(image_folder, f"{rating_key}.thumb.webp")
            if download_and_convert_image(show, image_path, plex_server):
                show_images_downloaded += 1
            else:
                show_images_failed += 1
            
            valid_show_years = [year for year in show_years if year is not None]
            show_year_range = f"{min(valid_show_years)}-{max(valid_show_years)}" if valid_show_years else None
            
            show_data = {
                "ratingKey": rating_key,
                "title": show.title,
                "avgEpisodeDuration": human_readable_duration(show.duration) if show.duration else None,
                "contentRating": show.contentRating,
                "seasonCount": show.seasonCount,
                "showTotalEpisode": show_total_episodes,
                "showSizeHuman": human_readable_size(show_size_bytes),
                "avgVideoResolutions": ", ".join(sorted(set([r for r in show_video_resolutions if r]))),
                "avgAudioCodecs": ", ".join(sorted(set([c for c in show_audio_codecs if c]))),
                "avgVideoCodecs": ", ".join(sorted(set([c for c in show_video_codecs if c]))),
                "avgContainers": ", ".join(sorted(set([c for c in show_containers if c]))),
                "showYearRange": show_year_range,
                "seasons": seasons
            }
            
            simplified_tvshows.append(show_data)
            
        except Exception as e:
            print(f"Error processing show {show.title}: {e}")
            continue
    
    metadata = {
        "totalShow": total_shows,
        "totalSeasonCount": total_seasons,
        "TotalEpisode": total_episodes,
        "totalSizeHuman": human_readable_size(total_size_bytes)
    }
    
    output_data = {"metadata": metadata, "shows": simplified_tvshows}
    output_path = os.path.join(REF_DIR, "tvshows_ref.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4)
    
    print(f"\nProcessed {total_shows} shows. Saved to {output_path}")
    print(f"Show images: {show_images_downloaded} downloaded, {show_images_failed} failed")
    print(f"Season images: {season_images_downloaded} downloaded, {season_images_failed} failed")

def process_music(library: LibrarySection, plex_server: PlexServer):
    """Process music library."""
    print(f"Processing {library.title} library...")
    
    # Fetch artists with retry logic and longer timeout
    artists = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Fetching artists from library (attempt {attempt + 1}/{max_retries})...")
            artists = library.all()
            break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 5
                print(f"  Timeout fetching artists, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Failed to fetch artists after {max_retries} attempts: {e}")
                return
    
    if not artists:
        print("❌ No artists retrieved")
        return
    
    artists_data = defaultdict(lambda: {"albums": [], "totalSizeBytes": 0, "totalTracks": 0, "totalAlbums": 0, "years": [], "ratingKey": None})
    artist_rating_keys = {}  # Map artist names to rating keys
    total_artists = 0
    total_albums = 0
    total_tracks = 0
    total_size_bytes = 0
    total_duration = 0
    
    image_folder = IMAGE_FOLDERS.get("Music")
    os.makedirs(image_folder, exist_ok=True)
    
    total_count = len(artists)
    print(f"Found {total_count} artists. Processing...")
    print("Downloading images (this may take a while)...")
    
    artist_images_downloaded = 0
    artist_images_failed = 0
    album_images_downloaded = 0
    album_images_failed = 0
    
    for idx, artist in enumerate(artists, 1):
        try:
            if idx % 10 == 0 or idx == total_count:
                print(f"  Progress: {idx}/{total_count} ({idx*100//total_count}%)")
            
            artist_name = artist.title
            artist_rating_key = artist.ratingKey
            total_artists += 1
            
            # Store rating key for this artist name
            if artist_name not in artist_rating_keys:
                artist_rating_keys[artist_name] = artist_rating_key
            
            # Download and convert artist thumbnail (always replace to handle rating key changes)
            image_path = os.path.join(image_folder, f"{artist_rating_key}.thumb.webp")
            if download_and_convert_image(artist, image_path, plex_server):
                artist_images_downloaded += 1
            else:
                artist_images_failed += 1
            
            # Handle collaborative artists (semicolon-separated)
            if ";" in artist_name:
                collaborators = [name.strip() for name in artist_name.split(';')]
                # Fetch albums with retry
                albums_list = None
                for attempt in range(3):
                    try:
                        albums_list = artist.albums()
                        break
                    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                        if attempt < 2:
                            time.sleep((attempt + 1) * 2)
                            continue
                        else:
                            print(f"  ⚠️  Failed to fetch albums for {artist_name}, skipping...")
                            albums_list = []
                
                for album in albums_list or []:
                    album_stats = {'downloaded': 0, 'skipped': 0, 'failed': 0}
                    album_data, album_size_bytes, album_duration = process_album(album, image_folder, plex_server, album_stats)
                    album_images_downloaded += album_stats['downloaded']
                    album_images_failed += album_stats['failed']
                    for collaborator in collaborators:
                        artists_data[collaborator]["albums"].append(album_data)
                        artists_data[collaborator]["totalSizeBytes"] += album_size_bytes
                        artists_data[collaborator]["totalTracks"] += album_data["tracks"]
                        artists_data[collaborator]["totalAlbums"] += 1
                        artists_data[collaborator]["years"].append(album.year)
                        if not artists_data[collaborator]["ratingKey"]:
                            artists_data[collaborator]["ratingKey"] = artist_rating_key
                        total_duration += album_duration
                    total_albums += 1
                    total_tracks += album_data["tracks"]
                    total_size_bytes += album_size_bytes
            else:
                # Fetch albums with retry
                albums_list = None
                for attempt in range(3):
                    try:
                        albums_list = artist.albums()
                        break
                    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                        if attempt < 2:
                            time.sleep((attempt + 1) * 2)
                            continue
                        else:
                            print(f"  ⚠️  Failed to fetch albums for {artist_name}, skipping...")
                            albums_list = []
                
                for album in albums_list or []:
                    album_stats = {'downloaded': 0, 'skipped': 0, 'failed': 0}
                    album_data, album_size_bytes, album_duration = process_album(album, image_folder, plex_server, album_stats)
                    album_images_downloaded += album_stats['downloaded']
                    album_images_failed += album_stats['failed']
                    artists_data[artist_name]["albums"].append(album_data)
                    artists_data[artist_name]["totalSizeBytes"] += album_size_bytes
                    artists_data[artist_name]["totalTracks"] += album_data["tracks"]
                    artists_data[artist_name]["totalAlbums"] += 1
                    artists_data[artist_name]["years"].append(album.year)
                    if not artists_data[artist_name]["ratingKey"]:
                        artists_data[artist_name]["ratingKey"] = artist_rating_key
                    total_duration += album_duration
                    total_albums += 1
                    total_tracks += album_data["tracks"]
                    total_size_bytes += album_size_bytes
        except Exception as e:
            print(f"Error processing artist {artist.title}: {e}")
            continue
    
    output_artists = []
    for artist_name, data in artists_data.items():
        valid_years = [year for year in data["years"] if year]
        year_range = f"{min(valid_years)}-{max(valid_years)}" if valid_years else None
        output_artists.append({
            "artistName": artist_name,
            "ratingKey": data["ratingKey"] or artist_rating_keys.get(artist_name),
            "totalAlbums": data["totalAlbums"],
            "totalTracks": data["totalTracks"],
            "totalSizeHuman": human_readable_size(data["totalSizeBytes"]),
            "yearRange": year_range,
            "albums": data["albums"]
        })
    
    metadata = {
        "totalArtists": len(output_artists),
        "totalAlbums": total_albums,
        "totalTracks": total_tracks,
        "totalSizeHuman": human_readable_size(total_size_bytes),
        "totalDurationHuman": human_readable_duration(total_duration)
    }
    
    output_data = {"metadata": metadata, "artists": output_artists}
    output_path = os.path.join(REF_DIR, "music_ref.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4)
    
    print(f"\nProcessed {len(output_artists)} artists. Saved to {output_path}")
    print(f"Artist images: {artist_images_downloaded} downloaded, {artist_images_failed} failed")
    print(f"Album images: {album_images_downloaded} downloaded, {album_images_failed} failed")

def process_album(album: Album, image_folder: str, plex_server: PlexServer, image_stats=None):
    """Process a single album."""
    album_data = {
        "ratingKey": album.ratingKey,
        "title": album.title,
        "year": album.year,
        "tracks": len(album.tracks()),
        "albumSizeHuman": None,
        "totalAlbumSizeBytes": 0,
        "albumDurationHuman": None,
        "albumContainers": []
    }
    
    album_size_bytes = 0
    total_duration = 0
    containers = set()
    
    # Download and convert album thumbnail (always replace to handle rating key changes)
    image_path = os.path.join(image_folder, f"{album.ratingKey}.thumb.webp")
    if image_stats is not None:
        if download_and_convert_image(album, image_path, plex_server):
            image_stats['downloaded'] = image_stats.get('downloaded', 0) + 1
        else:
            image_stats['failed'] = image_stats.get('failed', 0) + 1
    else:
        download_and_convert_image(album, image_path, plex_server)
    
    # Fetch tracks with retry
    tracks_list = None
    for attempt in range(3):
        try:
            tracks_list = album.tracks()
            break
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError):
            if attempt < 2:
                time.sleep((attempt + 1) * 2)
                continue
            else:
                print(f"  ⚠️  Failed to fetch tracks for album {album.title}, using empty list...")
                tracks_list = []
    
    for track in tracks_list or []:
        for media in track.media:
            containers.add(media.container)
            total_duration += media.duration or 0
            for part in media.parts:
                album_size_bytes += part.size or 0
    
    album_data["albumSizeHuman"] = human_readable_size(album_size_bytes)
    album_data["totalAlbumSizeBytes"] = album_size_bytes
    album_data["albumDurationHuman"] = human_readable_duration(total_duration)
    album_data["albumContainers"] = list(containers)
    
    return album_data, album_size_bytes, total_duration

def main():
    """Main function to sync all libraries from Plex."""
    if not PLEX_URL or not PLEX_TOKEN:
        print("Error: PLEX_URL and PLEX_TOKEN environment variables must be set")
        return
    
    print(f"Connecting to Plex server at {PLEX_URL}...")
    # Increase timeout for PlexServer connection
    try:
        plex = PlexServer(PLEX_URL, PLEX_TOKEN, timeout=300)  # 5 minute timeout
    except Exception as e:
        print(f"❌ Failed to connect to Plex server: {e}")
        print("\nTroubleshooting:")
        print("  1. Verify PLEX_URL is correct and accessible")
        print("  2. Verify PLEX_TOKEN is correct")
        print("  3. Check if Plex server is running")
        return
    
    # Ensure output directories exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(REF_DIR, exist_ok=True)
    
    # Process each library
    for library_name in LIBRARY_NAMES:
        try:
            library = plex.library.section(library_name)
            print(f"\n{'='*50}")
            print(f"Processing library: {library_name}")
            print(f"{'='*50}")
            
            if library_name == "Movies":
                process_movies(library, plex)
            elif library_name == "TV Shows":
                process_tvshows(library, plex)
            elif library_name == "Music":
                process_music(library, plex)
            else:
                print(f"Unknown library type: {library_name}")
        except Exception as e:
            print(f"Error processing library {library_name}: {e}")
            continue
    
    print("\n" + "="*50)
    print("Sync complete!")
    print("="*50)

if __name__ == "__main__":
    main()

