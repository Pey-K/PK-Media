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
SECTION_ID = 5
LIBRARY_NAME = "Music"
OUTPUT_DIR = "../../data/gen"
REF_DIR = "../../data"
IMAGE_FOLDER = "../../assets/images/music_image"
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
    response = requests.get(endpoint, params=params, timeout=40)
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
    os.makedirs(IMAGE_FOLDER, exist_ok=True)

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

    process_music_data(new_json_path, os.path.join(REF_DIR, "music_ref.json"))

    for root, _, files in os.walk(extract_folder):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                try:
                    rating_key = file.split("[")[-1].split("]")[0]
                    source_path = os.path.join(root, file)
                    
                    temp_webp_filename = f"{rating_key}.thumb.webp"
                    temp_webp_path = os.path.join(root, temp_webp_filename)
                    if convert_jpg_to_webp(source_path, temp_webp_path):
                        dest_path = os.path.join(IMAGE_FOLDER, temp_webp_filename)
                        shutil.move(temp_webp_path, dest_path)
                        print(f"Moved WebP image to {dest_path}")
                    else:
                        print(f"Skipping {file} due to conversion failure")
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
    """Main function to automate export, download, and process for Music library."""
    print(f"\nStarting export for section {SECTION_ID} ({LIBRARY_NAME})")
    export_id = export_metadata(SECTION_ID)
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
                    process_export_zip(zip_path, SECTION_ID, LIBRARY_NAME)
                    # Git operations
                    os.system('git add ../../data/*.json ../../assets/images/music_image/*.webp')
                    os.system('git commit -m "Music library update" --allow-empty')
                    os.system('git push')
                break
            else:
                print(f"Export in progress: {progress}%")
                time.sleep(30)

if __name__ == "__main__":
    main()