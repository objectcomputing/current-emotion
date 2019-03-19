const PORT = 1919;

const {exec} = require('child_process');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(morgan('short'));

function handleError(res, err) {
  console.error(err);
  res.sendStatus(500);
}

app.get('/token', async (req, res) => {
  let command = 'gcloud auth activate-service-account --key-file secret.json';
  exec(command, (err, stdout, stderr) => {
    if (err) return handleError(res, err);

    command = 'gcloud auth print-access-token';
    exec(command, (err, stdout, stderr) => {
      if (err) return handleError(res, err);

      res.send(stdout);
    });
  });
});

app.listen(PORT, () => console.info('ready'));
