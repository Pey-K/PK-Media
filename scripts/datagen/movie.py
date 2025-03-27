import json

# Input and output file paths
input_file = "../../data/gen/Library - Movies - All.json"  # Replace with your actual path if necessary
output_file = "../../data/movies_ref.json"

def human_readable_size(total_bytes):
    if total_bytes >= 1_000_000_000_000:
        return f"{total_bytes / 1_000_000_000_000:.2f} TB"
    else:
        return f"{total_bytes / 1_000_000_000:.2f} GB"

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

def extract_movie_data(input_path, output_path):
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

extract_movie_data(input_file, output_file)
