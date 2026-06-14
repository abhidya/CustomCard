# Generated Image Storage Optimization

Generated image bytes are persisted as object-store artifacts, not inline API
response data. The API runtime decodes provider data URLs, optimizes the bytes
before object-store persistence, stores signed artifacts, and returns artifact
URLs plus compression metadata.

## Decision

- Raster PNG, JPEG, and WebP inputs are encoded as WebP with bounded quality when
  the result is smaller than the original.
- SVG inputs stay SVG and are losslessly minified.
- Original raster bytes are kept only when compression fails, the input type is
  unsupported, or the compressed result would be larger.
- Content hashing and deduplication use the stored optimized bytes, so duplicate
  accounting reflects actual storage cost.

## Rationale

Object storage is the durable source of truth for generated card imagery. API
payloads should stay small, signed URLs should mediate access, and storage savings
should be observable through `originalByteLength`, `storedByteLength`,
`savedBytes`, MIME types, dimensions, and compression algorithm metadata.

## Rejected

- Persisting original base64 images in API payloads or database records.
- Always converting every image regardless of size.
- Claiming compression when the runtime cannot produce smaller, readable bytes.
