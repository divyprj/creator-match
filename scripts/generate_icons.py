import os
import math
from PIL import Image, ImageDraw

def create_icon(size=256):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx, cy = size / 2.0, size / 2.0
    r_boundary = size / 2.0
    
    c1 = (29, 143, 255)  # #1D8FFF
    c2 = (10, 107, 255)  # #0A6BFF
    
    # Fill circular area with gradient, rest is transparent
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            if dx * dx + dy * dy <= r_boundary * r_boundary:
                t = (x + y) / (2.0 * size)
                t = max(0.0, min(1.0, t))
                red = int(c1[0] + (c2[0] - c1[0]) * t)
                green = int(c1[1] + (c2[1] - c1[1]) * t)
                blue = int(c1[2] + (c2[2] - c1[2]) * t)
                img.putpixel((x, y), (red, green, blue, 255))

    draw = ImageDraw.Draw(img)
    scale = size / 24.0
    
    # Draw face outline (circle cx=12, cy=12, r=10 on 24x24 grid)
    face_cx = 12.0 * scale
    face_cy = 12.0 * scale
    face_r = 10.0 * scale
    stroke_w = max(1, int(2.5 * scale))
    
    draw.ellipse(
        [face_cx - face_r, face_cy - face_r, face_cx + face_r, face_cy + face_r],
        outline=(255, 255, 255, 255),
        width=stroke_w
    )
    
    # Draw eyes (dots at 9,9 and 15,9 on 24x24 grid)
    eye_r = stroke_w / 2.0
    
    eye1_cx = 9.0 * scale
    eye1_cy = 9.0 * scale
    draw.ellipse(
        [eye1_cx - eye_r, eye1_cy - eye_r, eye1_cx + eye_r, eye1_cy + eye_r],
        fill=(255, 255, 255, 255)
    )
    
    eye2_cx = 15.0 * scale
    eye2_cy = 9.0 * scale
    draw.ellipse(
        [eye2_cx - eye_r, eye2_cy - eye_r, eye2_cx + eye_r, eye2_cy + eye_r],
        fill=(255, 255, 255, 255)
    )
    
    # Draw smile mouth
    # Bounding box is [8, 12, 16, 16] on 24x24 grid
    m_x0 = 8.0 * scale
    m_y0 = 12.0 * scale
    m_x1 = 16.0 * scale
    m_y1 = 16.0 * scale
    
    draw.arc(
        [m_x0, m_y0, m_x1, m_y1],
        start=0,
        end=180,
        fill=(255, 255, 255, 255),
        width=stroke_w
    )
    
    return img

if __name__ == "__main__":
    os.makedirs("public", exist_ok=True)
    img256 = create_icon(256)
    
    # Save as PNG
    img256.save("public/icon.png")
    print("Saved public/icon.png")
    
    # Save as ICO with multiple sizes (including small sizes properly for Windows shell display)
    img16 = create_icon(16)
    img32 = create_icon(32)
    img48 = create_icon(48)
    
    img256.save("public/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])
    print("Saved public/icon.ico")
