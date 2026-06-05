# Implementing REST APIs in Convex

Since we moved away from Express to a fully serverless Convex architecture, your frontend components communicate with Convex natively using `useQuery` and `useMutation`. 

However, to provide a **Public API** (so that other projects, apps, or scripts can upload and retrieve images programmatically), we need to set up **Convex HTTP Actions**.

## User Review Required

> [!IMPORTANT]
> Since we removed the custom `API Key` database from the old PostgreSQL setup, any HTTP APIs we expose now will be completely open and public by default unless we implement a new API Key validation system inside Convex. 
> 
> **For this plan, I will implement the endpoints without authentication** so you can easily test them. Let me know if you want me to add API Key protection!

## Proposed Changes

We will create a new Convex file that listens for standard HTTP requests and routes them to your database and storage.

### [NEW] `frontend/convex/http.ts`

Convex allows us to define standard HTTP routes. I will create three endpoints:

1. **`GET /api/media`**
   - Returns a JSON array of all media files in the database.
   
2. **`GET /api/media/*`** 
   - E.g., `GET /api/media/kg2a1b3c4d5e...`
   - Accepts a `storageId` in the URL path.
   - Automatically returns the raw image/video file directly from Convex Storage (perfect for `<img src="...">` tags in other apps).

3. **`POST /api/upload`**
   - Accepts a raw binary file upload via `POST`.
   - Stores the file in Convex Storage.
   - Saves the metadata to the `media` database table.
   - Returns a JSON response with the new `storageId` and the file's direct URL.

## Verification Plan

Once implemented, you will be able to test the API directly using your Convex HTTP Actions URL: `https://cautious-alligator-235.convex.site`.

**To upload an image:**
```bash
curl -X POST https://cautious-alligator-235.convex.site/api/upload \
  -H "Content-Type: image/jpeg" \
  --data-binary "@my-image.jpg"
```

**To view an image:**
Simply visit `https://cautious-alligator-235.convex.site/api/media/<STORAGE_ID>` in any browser.
