import os
os.environ['U2NET_HOME'] = 'd:\\u2net'

from rembg import remove
from PIL import Image

input_path = 'assets/logo.png'
output_path = 'assets/logo.png'

print(f"Opening {input_path}")
try:
    with open(input_path, 'rb') as i:
        input_data = i.read()
    output_data = remove(input_data)
    with open(output_path, 'wb') as o:
        o.write(output_data)
    print("Background removed successfully.")
except Exception as e:
    print(f"Error: {e}")
