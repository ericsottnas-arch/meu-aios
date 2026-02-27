"""
Align and crop both before/after photos so faces are the same size and position.
Uses face detection to find face bounding box, then crops/scales to match.
"""
import cv2
import numpy as np
from PIL import Image

def detect_face(img_path):
    """Detect the largest face and return bounding box."""
    img = cv2.imread(img_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use Haar cascade for face detection
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(200, 200))

    if len(faces) == 0:
        print(f"  ⚠️ No face detected in {img_path}, using center crop")
        h, w = img.shape[:2]
        return (w//4, h//6, w//2, int(h*0.6))

    # Get largest face
    largest = max(faces, key=lambda f: f[2] * f[3])
    return tuple(largest)

def align_and_crop(antes_path, depois_path, output_size=(1080, 1400)):
    """
    1. Detect face in both images
    2. Scale so faces are same size
    3. Crop with face centered at same position
    4. Output same-size images with aligned faces
    """
    out_w, out_h = output_size

    # Detect faces
    print("Detectando rostos...")
    ax, ay, aw, ah = detect_face(antes_path)
    dx, dy, dw, dh = detect_face(depois_path)

    print(f"  Antes: face at ({ax},{ay}) size {aw}x{ah}")
    print(f"  Depois: face at ({dx},{dy}) size {dw}x{dh}")

    # Load images
    antes_img = Image.open(antes_path)
    depois_img = Image.open(depois_path)

    # Target face size (use average)
    target_face_w = int((aw + dw) / 2)

    # Scale factors to make faces same size
    antes_scale = target_face_w / aw
    depois_scale = target_face_w / dw

    print(f"  Scale antes: {antes_scale:.3f}, depois: {depois_scale:.3f}")

    # Resize images
    antes_resized = antes_img.resize(
        (int(antes_img.width * antes_scale), int(antes_img.height * antes_scale)),
        Image.LANCZOS
    )
    depois_resized = depois_img.resize(
        (int(depois_img.width * depois_scale), int(depois_img.height * depois_scale)),
        Image.LANCZOS
    )

    # Recalculate face centers after scaling
    antes_cx = int((ax + aw/2) * antes_scale)
    antes_cy = int((ay + ah/2) * antes_scale)
    depois_cx = int((dx + dw/2) * depois_scale)
    depois_cy = int((dy + dh/2) * depois_scale)

    # Target: face center should be at (out_w/2, out_h * 0.33) in final crop
    target_cx = out_w // 2
    target_cy = int(out_h * 0.32)

    # Calculate crop boxes (centered on face)
    def calc_crop(img, cx, cy):
        left = max(0, cx - target_cx)
        top = max(0, cy - target_cy)
        right = left + out_w
        bottom = top + out_h

        # Adjust if out of bounds
        if right > img.width:
            right = img.width
            left = right - out_w
        if bottom > img.height:
            bottom = img.height
            top = bottom - out_h
        if left < 0:
            left = 0
            right = out_w
        if top < 0:
            top = 0
            bottom = out_h

        return (left, top, right, bottom)

    antes_crop = calc_crop(antes_resized, antes_cx, antes_cy)
    depois_crop = calc_crop(depois_resized, depois_cx, depois_cy)

    antes_final = antes_resized.crop(antes_crop)
    depois_final = depois_resized.crop(depois_crop)

    # Ensure exact output size
    antes_final = antes_final.resize(output_size, Image.LANCZOS)
    depois_final = depois_final.resize(output_size, Image.LANCZOS)

    # Save
    antes_final.save('antes_aligned.jpg', quality=95)
    depois_final.save('depois_aligned.jpg', quality=95)

    print(f"\n✅ antes_aligned.jpg ({out_w}x{out_h})")
    print(f"✅ depois_aligned.jpg ({out_w}x{out_h})")
    print("Rostos alinhados no mesmo tamanho e posição!")

if __name__ == '__main__':
    align_and_crop('antes_dark.jpg', 'depois_dark.jpg', output_size=(1080, 1400))
