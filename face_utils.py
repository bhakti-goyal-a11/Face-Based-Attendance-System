"""
face_utils.py
Wraps the `face_recognition` library calls used by the original notebook:
encoding a face from an uploaded image, and verifying a live capture
against a stored encoding.
"""
 
import io
import numpy as np
 
try:
    import face_recognition
    FACE_AVAILABLE = True
except Exception:
    FACE_AVAILABLE = False
 
MATCH_THRESHOLD = 0.50  # same threshold used in the original notebook
 
 
def encode_face_from_bytes(image_bytes: bytes):
    """
    Returns (encoding: list[float] | None, error: str | None)
    """
    if not FACE_AVAILABLE:
        return None, "face_recognition library is not installed on the server."
 
    try:
        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    except Exception:
        return None, "Could not read the uploaded image."
 
    locations = face_recognition.face_locations(image)
 
    if len(locations) == 0:
        return None, "No face detected. Please capture your face clearly."
    if len(locations) > 1:
        return None, "Multiple faces detected. Only one face should be visible."
 
    encodings = face_recognition.face_encodings(image, locations)
    if len(encodings) == 0:
        return None, "Unable to generate a face encoding from the image."
 
    return encodings[0].tolist(), None
 
 
def verify_face_from_bytes(known_encoding: list, image_bytes: bytes):
    """
    Returns (verified: bool, message: str)
    """
    if not FACE_AVAILABLE:
        return False, "face_recognition library is not installed on the server."
 
    if known_encoding is None:
        return False, "No registered face found for this user."
 
    current_encoding, error = encode_face_from_bytes(image_bytes)
    if error:
        return False, error
 
    known = np.asarray(known_encoding)
    current = np.asarray(current_encoding)
 
    distance = float(face_recognition.face_distance([known], current)[0])
 
    if distance <= MATCH_THRESHOLD:
        return True, f"Face verified successfully (distance: {distance:.3f})"
    return False, f"Face mismatch (distance: {distance:.3f})"
 