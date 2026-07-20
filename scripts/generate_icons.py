import os
import math
from PIL import Image, ImageDraw

def create_icon(size=256):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size / 2, size / 2
    r = size * 14 / 32
    
    c1 = (0, 149, 246)
    c2 = (91, 81, 216)
    
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            if dx*dx + dy*dy <= r*r:
                min_p = (cx - r/math.sqrt(2)) + (cy - r/math.sqrt(2))
                max_p = (cx + r/math.sqrt(2)) + (cy + r/math.sqrt(2))
                p = x + y
                t = (p - min_p) / (max_p - min_p)
                t = max(0.0, min(1.0, t))
                
                red = int(c1[0] + (c2[0] - c1[0]) * t)
                green = int(c1[1] + (c2[1] - c1[1]) * t)
                blue = int(c1[2] + (c2[2] - c1[2]) * t)
                img.putpixel((x, y), (red, green, blue, 255))

    draw = ImageDraw.Draw(img)
    scale = size / 32.0
    
    c_left_x = 13 * scale
    c_left_y = 16 * scale
    r_circle = 5 * scale
    stroke_w = max(1, int(2 * scale))
    
    draw.ellipse(
        [c_left_x - r_circle, c_left_y - r_circle, c_left_x + r_circle, c_left_y + r_circle],
        outline=(255, 255, 255, 217),
        width=stroke_w
    )
    
    c_right_x = 19 * scale
    c_right_y = 16 * scale
    draw.ellipse(
        [c_right_x - r_circle, c_right_y - r_circle, c_right_x + r_circle, c_right_y + r_circle],
        outline=(255, 255, 255, 217),
        width=stroke_w
    )
    
    sparkle_coords = [
        (16 * scale, 11.5 * scale),
        (16.8 * scale, 14.2 * scale),
        (19.5 * scale, 15 * scale),
        (16.8 * scale, 15.8 * scale),
        (16 * scale, 18.5 * scale),
        (15.2 * scale, 15.8 * scale),
        (12.5 * scale, 15 * scale),
        (15.2 * scale, 14.2 * scale)
    ]
    draw.polygon(sparkle_coords, fill=(255, 255, 255, 255))
    
    return img

if __name__ == "__main__":
    os.makedirs("public", exist_ok=True)
    img256 = create_icon(256)
    
    # Save as PNG
    img256.save("public/icon.png")
    print("Saved public/icon.png")
    
    # Generate smaller sizes for ICO inclusion
    img16 = create_icon(16)
    img32 = create_icon(32)
    img48 = create_icon(48)
    
    # Save as ICO with multiple sizes
    img256.save("public/icon.ico", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
    print("Saved public/icon.ico")
