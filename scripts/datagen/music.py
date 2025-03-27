import json
from collections import defaultdict

# Input and output file paths
input_file = "../../data/gen/Library - Music - All.json"  # Replace with your actual path if necessary
output_file = "../../data/music_ref.json"

def human_readable_size(total_bytes):
    if total_bytes >= 1_000_000_000:
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

def extract_music_data(input_path, output_path):
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


extract_music_data(input_file, output_file)
