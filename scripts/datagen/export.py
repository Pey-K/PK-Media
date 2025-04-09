import requests
import time
import re
import zipfile
import os
import shutil
import json
from collections import defaultdict
import ffmpeg

TAUTULLI_URL = os.getenv("TAUTULLI_URL")
API_KEY = os.getenv("API_KEY")
SECTION_IDS = {
    1: "Movies",
    2: "TV Shows",
    5: "Music"
}
OUTPUT_DIR = "../../data/gen"
REF_DIR = "../../data"
IMAGE_FOLDERS = {
    1: "../../assets/images/movie_image", 
    2: "../../assets/images/tv_image",
    5: "../../assets/images/music_image"
} 
FILE_FORMAT = "json"
METADATA_LEVEL = 1
MEDIA_INFO_LEVEL = 2
THUMB_LEVEL = 9 

def human_readable_size(total_bytes):
    if total_bytes >= 1_000_000_000_000:
        return f"{total_bytes / 1_000_000_000_000:.2f} TB"
    elif total_bytes >= 1_000_000_000:
        return f"{total_bytes / 1_000_000_000:.2f} GB"
    else:
        return f"{total_bytes / 1_000_000:.2f} MB"

def format_resolution(resolution):
    if resolution is None:
        return None
    resolution = resolution.lower()
    if resolution == "4k":
        return "2160p"
    elif resolution.isdigit():
        return f"{resolution}p"
    return resolution

def format_codec(codec):
    if codec is None:
        return None
    return codec.upper()

def human_readable_duration(total_milliseconds):
    total_seconds = total_milliseconds // 1000
    minutes, seconds = divmod(total_seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{hours} hrs {minutes} mins"
    elif minutes >= 10:
        return f"{minutes} mins"
    elif minutes > 0:
        return f"{minutes} mins {seconds} secs"
    else:
        return f"{seconds} secs"

def split_collaborative_artists(artist_name):
    return [name.strip() for name in artist_name.split(';')]

def aggregate_unique(values):
    filtered_values = [v for v in values if v is not None]
    return ", ".join(sorted(set(filtered_values)))

def process_movie_data(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as file:
        movies = json.load(file)
    
    total_movies = 0
    total_size_bytes = 0
    simplified_movies = []

    for movie in movies:
        try:
            total_movies += 1
            media = movie["media"][0]
            part = media["parts"][0]
            size_bytes = part.get("size", 0)
            total_size_bytes += size_bytes
            
            simplified_movies.append({
                "ratingKey": movie["ratingKey"],
                "title": movie["title"],
                "year": movie.get("year"),
                "contentRating": movie.get("contentRating"),
                "durationHuman": movie.get("durationHuman"),
                "audioCodec": format_codec(media.get("audioCodec")),
                "container": part.get("container"),
                "videoCodec": format_codec(media.get("videoCodec")),
                "videoResolution": format_resolution(media.get("videoResolution")),
                "sizeHuman": part.get("sizeHuman"),
            })
        except (KeyError, IndexError) as e:
            print(f"Skipping movie due to missing data: {movie.get('title', 'Unknown')} - Error: {e}")
    
    metadata = {
        "totalMovies": total_movies,
        "totalSizeHuman": human_readable_size(total_size_bytes)
    }

    output_data = {"metadata": metadata, "movies": simplified_movies}
    
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(output_data, file, indent=4)
    
    print(f"Cleaned up Movie data and saved to {output_path}")

def process_music_data(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as file:
        music_data = json.load(file)

    artists_data = defaultdict(lambda: {"albums": [], "totalSizeBytes": 0, "totalTracks": 0, "totalAlbums": 0, "years": []})
    total_artists = 0
    total_albums = 0
    total_tracks = 0
    total_size_bytes = 0
    total_duration = 0

    for artist in music_data:
        artist_name = artist["title"]
        artist_rating_key = artist.get("ratingKey")
        total_artists += 1

        if ";" in artist_name:
            collaborators = split_collaborative_artists(artist_name)
            for album in artist.get("albums", []):
                album_data, album_size_bytes, album_duration = process_album(album)
                for collaborator in collaborators:
                    matching_artist = next((a for a in music_data if a["title"] == collaborator), None)
                    if matching_artist and matching_artist.get("ratingKey"):
                        artists_data[collaborator]["albums"].append(album_data)
                        artists_data[collaborator]["totalSizeBytes"] += album_size_bytes
                        artists_data[collaborator]["totalTracks"] += album_data["tracks"]
                        artists_data[collaborator]["totalAlbums"] += 1
                        artists_data[collaborator]["years"].append(album.get("year", None))
                        total_duration += album_duration
                total_albums += 1
                total_tracks += album_data["tracks"]
                total_size_bytes += album_size_bytes
        else:
            for album in artist.get("albums", []):
                album_data, album_size_bytes, album_duration = process_album(album)
                artists_data[artist_name]["albums"].append(album_data)
                artists_data[artist_name]["totalSizeBytes"] += album_size_bytes
                artists_data[artist_name]["totalTracks"] += album_data["tracks"]
                artists_data[artist_name]["totalAlbums"] += 1
                artists_data[artist_name]["years"].append(album.get("year", None))
                total_duration += album_duration
                total_albums += 1
                total_tracks += album_data["tracks"]
                total_size_bytes += album_size_bytes

    output_artists = []
    for artist_name, data in artists_data.items():
        valid_years = [year for year in data["years"] if year]
        year_range = f"{min(valid_years)}-{max(valid_years)}" if valid_years else None
        output_artists.append({
            "artistName": artist_name,
            "ratingKey": next((a["ratingKey"] for a in music_data if a["title"] == artist_name), None),
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

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(output_data, file, indent=4)

    print(f"Cleaned up Music data and saved to {output_path}")

def process_album(album):
    album_data = {
        "ratingKey": album["ratingKey"],
        "title": album["title"],
        "year": album.get("year"),
        "tracks": len(album.get("tracks", [])),
        "albumSizeHuman": None,
        "totalAlbumSizeBytes": 0,
        "albumDurationHuman": None,
        "albumContainers": []
    }

    album_size_bytes = 0
    total_duration = 0
    containers = set()

    for track in album.get("tracks", []):
        for media in track.get("media", []):
            containers.add(media.get("container"))
            total_duration += media.get("duration", 0)
            for part in media.get("parts", []):
                album_size_bytes += part.get("size", 0)

    album_data["albumSizeHuman"] = human_readable_size(album_size_bytes)
    album_data["totalAlbumSizeBytes"] = album_size_bytes
    album_data["albumDurationHuman"] = human_readable_duration(total_duration)
    album_data["albumContainers"] = list(containers)

    return album_data, album_size_bytes, total_duration

def process_tvshow_data(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as file:
        tv_shows = json.load(file)

    simplified_tvshows = []
    total_shows = 0
    total_seasons = 0
    total_episodes = 0
    total_size_bytes = 0

    for show in tv_shows:
        try:
            total_shows += 1
            show_size_bytes = 0
            show_total_episodes = 0
            show_years = []
            show_video_resolutions = []
            show_audio_codecs = []
            show_video_codecs = []
            show_containers = []

            seasons = []
            for season in show.get("seasons", []):
                total_seasons += 1
                season_size_bytes = 0
                season_total_episodes = 0
                season_years = []
                season_video_resolutions = []
                season_audio_codecs = []
                season_video_codecs = []
                season_containers = []

                for episode in season.get("episodes", []):
                    season_total_episodes += 1
                    show_total_episodes += 1
                    total_episodes += 1

                    episode_media = episode["media"][0]
                    episode_part = episode_media["parts"][0]

                    size_bytes = episode_part.get("size", 0)
                    season_size_bytes += size_bytes
                    show_size_bytes += size_bytes
                    total_size_bytes += size_bytes

                    season_video_resolutions.append(format_resolution(episode_media.get("videoResolution")))
                    season_audio_codecs.append(format_codec(episode_media.get("audioCodec")))
                    season_video_codecs.append(format_codec(episode_media.get("videoCodec")))
                    season_containers.append(episode_part.get("container"))

                    season_years.append(episode.get("year"))

                season_data = {
                    "seasonRatingKey": season.get("ratingKey"),
                    "seasonNumber": season.get("seasonNumber"),
                    "seasonTotalEpisode": season_total_episodes,
                    "seasonSizeHuman": human_readable_size(season_size_bytes),
                    "avgSeasonVideoResolution": aggregate_unique(season_video_resolutions),
                    "avgSeasonAudioCodec": aggregate_unique(season_audio_codecs),
                    "avgSeasonVideoCodec": aggregate_unique(season_video_codecs),
                    "avgSeasonContainer": aggregate_unique(season_containers),
                    "yearRange": f"{min(season_years)}-{max(season_years)}" if season_years else None
                }

                show_video_resolutions.extend(season_video_resolutions)
                show_audio_codecs.extend(season_audio_codecs)
                show_video_codecs.extend(season_video_codecs)
                show_containers.extend(season_containers)
                show_years.extend(season_years)

                seasons.append(season_data)

            show_data = {
                "ratingKey": show["ratingKey"],
                "title": show["title"],
                "avgEpisodeDuration": show.get("durationHuman"),
                "contentRating": show.get("contentRating"),
                "seasonCount": show.get("seasonCount"),
                "showTotalEpisode": show_total_episodes,
                "showSizeHuman": human_readable_size(show_size_bytes),
                "avgVideoResolutions": aggregate_unique(show_video_resolutions),
                "avgAudioCodecs": aggregate_unique(show_audio_codecs),
                "avgVideoCodecs": aggregate_unique(show_video_codecs),
                "avgContainers": aggregate_unique(show_containers),
                "showYearRange": f"{min(show_years)}-{max(show_years)}" if show_years else None,
                "seasons": seasons
            }

            simplified_tvshows.append(show_data)

        except (KeyError, IndexError) as e:
            print(f"Skipping show due to missing data: {show.get('title', 'Unknown')} - Error: {e}")

    metadata = {
        "totalShow": total_shows,
        "totalSeasonCount": total_seasons,
        "TotalEpisode": total_episodes,
        "totalSizeHuman": human_readable_size(total_size_bytes)
    }

    output_data = {"metadata": metadata, "shows": simplified_tvshows}

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(output_data, file, indent=4)

    print(f"Cleaned up TV-Show data and saved to {output_path}")

def export_metadata(section_id):
    """Initiate metadata export for a specific section_id and return the export_id."""
    endpoint = f"{TAUTULLI_URL}/api/v2"
    params = {
        "apikey": API_KEY,
        "cmd": "export_metadata",
        "section_id": section_id,
        "file_format": FILE_FORMAT,
        "metadata_level": METADATA_LEVEL,
        "media_info_level": MEDIA_INFO_LEVEL,
        "thumb_level": THUMB_LEVEL,
        "individual_files": "False"
    }
    response = requests.get(endpoint, params=params, timeout=10)
    result = response.json()
    if result["response"]["result"] == "success":
        export_id = result["response"]["data"]["export_id"]
        print(f"Export initiated for section {section_id}. Export ID: {export_id}")
        return export_id
    else:
        print(f"Error initiating export for section {section_id}: {result['response']['message']}")
        return None

def check_export_status(export_id):
    """Check the status of the export using export_id."""
    endpoint = f"{TAUTULLI_URL}/api/v2"
    params = {
        "apikey": API_KEY,
        "cmd": "get_exports_table"
    }
    response = requests.get(endpoint, params=params, timeout=10)
    result = response.json()
    if result["response"]["result"] == "success":
        exports = result["response"]["data"]["data"]
        for export in exports:
            if export["export_id"] == export_id:
                return export["complete"], export.get("progress", 0)
    print("Failed to check export status.")
    return None, None

def download_export(export_id):
    """Download the completed export zip file."""
    endpoint = f"{TAUTULLI_URL}/api/v2"
    params = {
        "apikey": API_KEY,
        "cmd": "download_export",
        "export_id": export_id
    }
    response = requests.get(endpoint, params=params, timeout=10)
    if response.status_code == 200:
        content_disposition = response.headers.get("Content-Disposition")
        if content_disposition:
            filename_match = re.findall("filename=(.+)", content_disposition)
            filename = filename_match[0].strip('"') if filename_match else f"export_{export_id}.zip"
        else:
            filename = f"export_{export_id}.zip"
        with open(filename, "wb") as f:
            f.write(response.content)
        print(f"Downloaded zip to {filename}")
        return filename
    else:
        print(f"Failed to download export {export_id}: {response.status_code}")
        return None

def convert_jpg_to_webp(source_path, temp_webp_path):
    """Convert a JPG image to WebP format using ffmpeg."""
    try:
        ffmpeg.input(source_path, **{'color_range': 'jpeg'}).output(
            temp_webp_path,
            vcodec='libwebp',
            quality=80,
            **{'color_range': 'jpeg'}
        ).run(overwrite_output=True, quiet=True)
        print(f"Converted {source_path} to {temp_webp_path}")
        return True
    except ffmpeg.Error as e:
        print(f"Error converting {source_path} to WebP: {e}")
        return False

def process_export_zip(zip_path, section_id, library_name):
    extract_folder = f"export_section_{section_id}"
    os.makedirs(extract_folder, exist_ok=True)
    image_folder = IMAGE_FOLDERS.get(section_id, f"images_{library_name.lower().replace(' ', '_')}")

    os.makedirs(image_folder, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_folder)
        print(f"Extracted zip to {extract_folder}")

    json_file = None
    for root, _, files in os.walk(extract_folder):
        for file in files:
            if file.endswith(".json"):
                json_file = os.path.join(root, file)
                new_json_name = f"Library - {library_name} - All.json"
                new_json_path = os.path.join(OUTPUT_DIR, new_json_name)
                shutil.move(json_file, new_json_path)
                print(f"Moved and renamed {file} to {new_json_name}")
                break
        if json_file:
            break

    if library_name == "Movies":
        process_movie_data(new_json_path, os.path.join(REF_DIR, "movies_ref.json"))
    elif library_name == "Music":
        process_music_data(new_json_path, os.path.join(REF_DIR, "music_ref.json"))
    elif library_name == "TV Shows":
        process_tvshow_data(new_json_path, os.path.join(REF_DIR, "tvshows_ref.json"))

    for root, _, files in os.walk(extract_folder):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                try:
                    # Step 1: Extract ratingKey and rename the file
                    rating_key = file.split("[")[-1].split("]")[0]
                    source_path = os.path.join(root, file)
                    
                    # Step 2: Convert to WebP
                    temp_webp_filename = f"{rating_key}.thumb.webp"
                    temp_webp_path = os.path.join(root, temp_webp_filename)
                    if convert_jpg_to_webp(source_path, temp_webp_path):
                        # Step 3: Move the WebP file to the destination folder
                        dest_path = os.path.join(image_folder, temp_webp_filename)
                        shutil.move(temp_webp_path, dest_path)
                        print(f"Moved WebP image to {dest_path}")
                    else:
                        print(f"Skipping {file} due to conversion failure")
                    
                    # Remove the original JPG file
                    os.remove(source_path)
                    print(f"Removed original image {source_path}")
                except IndexError:
                    print(f"Skipping image (couldn't extract ratingKey): {file}")
                    continue

    shutil.rmtree(extract_folder, ignore_errors=True)
    print(f"Removed temporary folder {extract_folder}")

    os.remove(zip_path)
    print(f"Removed zip file {zip_path}")

def main():
    """Main function to automate export, download, and process for multiple libraries."""
    for section_id, library_name in SECTION_IDS.items():
        print(f"\nStarting export for section {section_id} ({library_name})")
        export_id = export_metadata(section_id)
        if export_id:
            print(f"Waiting for export {export_id} to complete...")
            while True:
                complete, progress = check_export_status(export_id)
                if complete is None:
                    print("Error checking status. Aborting this export.")
                    break
                elif complete == 1:
                    print("Export complete.")
                    zip_path = download_export(export_id)
                    if zip_path:
                        process_export_zip(zip_path, section_id, library_name)
                    break
                else:
                    print(f"Export in progress: {progress}%")
                    time.sleep(30)

if __name__ == "__main__":
    main()