// Built-in Node module for working with file paths (joins, resolves, etc.)
const path = require('path');

// Load variables from a .env file into process.env.
// We build an absolute path that points to the repo root's .env,
// regardless of where Node is launched from (tests, dev, etc.).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // <-- points to repo-root/.env


// Import third-party and framework modules
const express = require('express');  // Web framework for HTTP servers and routing
const axios = require('axios');      // Promise-based HTTP client for Node (to call OMDb)
const morgan = require('morgan');    // HTTP request logger middleware

// Create an Express app instance
const app = express();

// Simple in-memory cache object to store OMDb responses by ID or title
// Key: imdbID or title string; Value: the JSON response from OMDb
const cache = {};

// Register morgan with the 'dev' format to log concise request info to the console
app.use(morgan('dev'));

// Define a GET handler for the root path '/'
// Marked 'async' so we can 'await' the axios call
app.get('/', async (req, res) => {
  try {
    // Read your OMDb API key from environment variables
    const omdbApiKey = process.env.API;

    // Will hold the full OMDb URL we plan to call (depends on whether ?i or ?t is provided)
    let omdbApiUrl;

    // If the cache already has a response for imdbID (?i), return it immediately
    if (cache[req.query.i]) {
      return res.json(cache[req.query.i]);
    // Else, if the cache has a response for title (?t), return it immediately
    } else if (cache[req.query.t]) {
      return res.json(cache[req.query.t]);
    }

    // If caller provided an IMDb ID via ?i, build the OMDb lookup by ID
    if (req.query.i) {
      omdbApiUrl = `http://www.omdbapi.com/?i=${req.query.i}&apikey=${omdbApiKey}`;
    // Else if caller provided a title via ?t, build the OMDb lookup by title
    } else if (req.query.t) {
      // (Tip: encodeURIComponent would be safer if titles contain spaces/special chars)
      omdbApiUrl = `http://www.omdbapi.com/?t=${req.query.t}&apikey=${omdbApiKey}`;
    }

    // Make the HTTP GET request to OMDb with axios (await the response)
    const response = await axios.get(omdbApiUrl);

    // After a successful request, store the data in cache using the same key used by the request
    if (req.query.i) {
      cache[req.query.i] = response.data;
    } else if (req.query.t) {
      cache[req.query.t] = response.data;
    }

    // Send the OMDb JSON data back to the client
    res.json(response.data);
  } catch (error) {
    // If anything goes wrong (network error, invalid key, etc.), log it and send a 500
    console.error('Error fetching data from OMDB API:', error);
    res.status(500).json({ error: 'Failed to fetch data from OMDB API' });
  }
});

// FYI/Note to self: When making calls to the OMDB API make sure to append '&apikey=8730e0e'
// (You’re actually using the key from process.env.API above, which is preferred and safer.)

// Export the app so tests (Mocha) or a separate launcher (server/index.js) can import and start it
module.exports = app;
