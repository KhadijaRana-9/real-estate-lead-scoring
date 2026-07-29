// Every media/document storage provider must export exactly this shape.
// Adding a new one (e.g. Azure Blob) means a new file implementing this
// interface, registered in providers/index.js - nothing in the upload
// routes or wizard changes.
//
// upload(buffer, originalName, mimeType) -> Promise<{ url: string, provider: string }>
//   Throws (with err.status = 503) if the provider isn't configured -
//   never silently fabricates a fake URL.
//
// isConfigured() -> boolean
//   Lets the routes/frontend report availability honestly without
//   attempting (and failing) a real upload first.
module.exports = {};
