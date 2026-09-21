# Pillow

> **Purpose:** Safe image boundary handling.

## Exact flow
1. enforce byte/pixel limits
2. `Image.open`
3. `verify()`
4. reopen
5. `ImageOps.exif_transpose`
6. convert to RGB
7. hand off to NumPy

## Do not
- use Pillow as the main CV engine
- trust file extension alone

## Tests
- corrupt image rejected
- oversized image rejected
- EXIF rotation corrected
