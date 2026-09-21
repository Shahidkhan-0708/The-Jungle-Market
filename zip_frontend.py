import os, zipfile
import sys

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        # Exclude massive folders from the zip
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.next' in dirs:
            dirs.remove('.next')
        if '.git' in dirs:
            dirs.remove('.git')
            
        for file in files:
            file_path = os.path.join(root, file)
            # Create a relative path for the zip structure
            arcname = os.path.relpath(file_path, os.path.dirname(path))
            ziph.write(file_path, arcname)

print("Compressing frontend...")
with zipfile.ZipFile('jungle_market_frontend.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('jungle-market', zipf)
print("Compression complete!")
