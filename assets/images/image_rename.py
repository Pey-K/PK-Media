import os

# Path to the images folder
images_folder = '_image'  # music_image tv_image movie_image

for file in os.listdir(images_folder):
    if file.endswith(".thumb.jpg"):
        try:
            rating_key = file.split("[")[-1].split("]")[0]
            new_filename = f"{rating_key}.thumb.jpg"
            
            old_path = os.path.join(images_folder, file)
            new_path = os.path.join(images_folder, new_filename)
            os.rename(old_path, new_path)
            print(f"Renamed: {file} -> {new_filename}")
        except IndexError:
            print(f"Skipping file (couldn't extract ratingKey): {file}")

print("Renaming complete!")
