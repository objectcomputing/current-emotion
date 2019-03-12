const USE_HTTPS = false;
const PORT = 1919;

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const https = require('https');
const morgan = require('morgan');
const path = require('path');

const app = express();
app.use(cors());
app.use(morgan('short'));

app.get('/token', async (req, res) => {});
let command =
  'gcloud auth activate-service-account --key-file oci-deep-gauge.json';
command = 'gcloud auth --refresh print-access-token';

if (USE_HTTPS) {
  const options = {
    key: fs.readFileSync('my-key.pem'),
    cert: fs.readFileSync('my-cert.pem')
  };
  const server = https.createServer(options, app);
  server.listen(PORT, () => console.info('ready'));
} else {
  // HTTP
  app.listen(PORT, () => console.info('ready'));
}
