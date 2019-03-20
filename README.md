# current-emotion

This is a web app that uses:

- React to render UI components
- Google Vision API to recognize emotions in faces (<https://cloud.google.com/vision/>)
- face-api.js to recognize faces in images (<https://github.com/justadudewhohacks/face-api.js>)
- emojis from <http://openmoji.org/>

To generate a new auth token:

- `gcloud auth activate-service-account --key-file src/secret.json`
- `gcloud auth print-access-token`
- copy the token this outputs into `src/secret.json`
  which is not saved in the Git repo

To run it:

- open a terminal
- `cd` to the project directory
- `cd server`
- `npm install`
- `npm start`
- open another terminal
- `cd` to the project directory
- `npm install`
- `npm start`
- browse localhost:3000
