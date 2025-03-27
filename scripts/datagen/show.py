import json
from collections import defaultdict

# Input and output file paths
input_file = "../../data/gen/Library - TV Shows - All.json"  # Replace with your actual path if necessary
output_file = "../../data/tvshows_ref.json"

def human_readable_size(total_bytes):
    if total_bytes >= 1_000_000_000_000:
        return f"{total_bytes / 1_000_000_000_000:.2f} TB"
    else:
        return f"{total_bytes / 1_000_000_000:.2f} GB"

def aggregate_unique(values):
    filtered_values = [v for v in values if v is not None]
    return ", ".join(sorted(set(filtered_values)))

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

def extract_tvshow_data(input_path, output_path):
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


extract_tvshow_data(input_file, output_file)
