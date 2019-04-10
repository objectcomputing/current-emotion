import * as faceApi from 'face-api.js';
import {capitalize} from 'lodash/string';
import {string} from 'prop-types';
import React, {useEffect, useState} from 'react';
import Bar from '../bar/bar';
import {getDataUrlFromVideo} from '../image-util';
import quotes from '../quotes.json';
import './camera.scss';

//const emotions = ['anger', 'headwear', 'joy', 'sorrow', 'surprise'];
const emotions = ['headwear', 'joy', 'surprise'];

const VIDEO_DETECT = true;

/*
const LIKELY_MAP = {
  UNKNOWN: 'not sure',
  VERY_UNLIKELY: 'no',
  UNLIKELY: 'probably not',
  POSSIBLE: 'maybe',
  LIKELY: 'probably',
  VERY_LIKELY: 'yes'
};
*/

const levelMap = {
  UNKNOWN: '',
  VERY_UNLIKELY: '',
  UNLIKELY: 'low',
  POSSIBLE: 'mid',
  LIKELY: 'high',
  VERY_LIKELY: 'high'
};

const percentMap = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 0,
  UNLIKELY: 25,
  POSSIBLE: 50,
  LIKELY: 75,
  VERY_LIKELY: 100
};

const FACE_PARAMS = {minFaceSize: 30};
const faceApiOptions = new faceApi.MtcnnOptions(FACE_PARAMS);

let canvas, context, video, videoOn, xRatio, yRatio;

async function onPlay(theVideo, setStatus) {
  if (!VIDEO_DETECT) return;

  canvas = document.querySelector('.video-canvas');
  video = theVideo.target ? theVideo.target : theVideo;

  // There is a coordinate mismatch between
  // the video element and the canvas element!
  xRatio = canvas.width / video.videoWidth;
  yRatio = canvas.height / video.videoHeight;

  context = canvas.getContext('2d');
  context.strokeStyle = 'red';
  context.lineWidth = 1;

  setStatus('The video stream is being analyzed for faces.');
  videoOn = true;
  detectFaces(setStatus);
}

async function detectFaces(setStatus) {
  const faces = await faceApi.detectAllFaces(video, faceApiOptions);
  //.withFaceLandmarks() // too much data!
  //.withFaceDescriptors(); // too much data!

  const {length} = faces;
  const prefix =
    length === 0
      ? 'No faces have'
      : length === 1
      ? '1 face has'
      : length + ' faces have';
  if (videoOn) setStatus(prefix + ' been detected.');
  outlineFaces(faces);
  //if (videoOn) setTimeout(() => detectFaces(setStatus), 200);
  if (videoOn) detectFaces(setStatus);
}

function handleError(e) {
  alert(e.message ? e.message : e);
  console.error(e);
}

function outlineFaces(faces) {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const face of faces) {
    const {x, y, width, height} = face.box;
    context.strokeRect(x * xRatio, y * yRatio, width * xRatio, height * yRatio);
  }
}

async function sendPhoto(photoData) {
  try {
    // Get a fresh auth token.
    let url = 'http://localhost:1919/token';
    let res = await fetch(url);
    if (res.status !== 200) {
      handleError(`Failed to get auth token from ${url}.`);
      return;
    }
    const authToken = await res.text();

    // Detect faces in the photo.
    url = 'https://vision.googleapis.com/v1/images:annotate';
    const headers = {
      Authorization: 'Bearer ' + authToken,
      'Content-Type': 'application/json'
    };
    const index = photoData.indexOf(',');
    const content = photoData.substring(index + 1);
    const body = JSON.stringify({
      requests: [
        {
          features: [{maxResults: 1, type: 'FACE_DETECTION'}],
          image: {content}
        }
      ]
    });

    res = await fetch(url, {method: 'POST', headers, body});
    const {status, statusText} = res;
    if (status === 200) {
      const obj = await res.json();
      return obj.responses[0].faceAnnotations[0];
    } else if (status === 401) {
      alert('Unauthorized: need new auth token');
    } else {
      alert(`status ${status}: ${statusText}`);
    }
  } catch (e) {
    handleError(e);
  }
}

async function startCamera() {
  const receiver = navigator.mediaDevices;

  // This is not defined in tests run in jsdom.
  if (receiver && receiver.getUserMedia) {
    const successCb = async stream => {
      if (window.Cypress) return;
      // Turn on camera and begin recording.
      const video = document.querySelector('.camera-video');
      video.srcObject = stream;

      if (VIDEO_DETECT) {
        const results = await faceApi.mtcnn(video, FACE_PARAMS);
        faceApi.drawDetection(
          'overlay',
          results.map(res => res.faceDetection),
          {
            withScore: false
          }
        );
        faceApi.drawLandmarks(
          'overlay',
          results.map(res => res.faceLandmarks),
          {
            lineWidth: 4,
            color: 'red'
          }
        );
      }
    };

    //const constraints = {facingMode: 'environment'};
    const constraints = {};
    try {
      const stream = await receiver.getUserMedia({video: constraints});
      successCb(stream);
    } catch (e) {
      // The most common errors are PermissionDenied and DevicesNotFound.
      console.error(e);
      console.error(e.message);
    }
  }
}

// Other source files can call this to stop the camera.
export function stopCamera() {
  if (window.Cypress) return;

  const video = document.querySelector('.camera-video');
  if (video.srcObject) {
    const tracks = video.srcObject.getVideoTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

async function takePhoto() {
  const video = document.querySelector('.camera-video');
  const canvas = document.querySelector('.camera-canvas');
  const context = canvas.getContext('2d');
  const photoData = getDataUrlFromVideo(video, canvas) || 'test-photo-url';

  // Display the image.
  const image = new Image();
  image.src = photoData;
  context.drawImage(image, 0, 0);

  /*
  const options = VIDEO_DETECT
    ? new faceApi.MtcnnOptions(FACE_PARAMS)
    : new faceApi.TinyFaceDetectorOptions();
  const faces = await faceApi.detectAllFaces(image, options);
  outlineFaces(faces);
  */

  stopCamera();

  return photoData;
}

function Camera() {
  const [annotations, setAnnotations] = useState();
  const [photoData, setPhotoData] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [status, setStatus] = useState();

  //const assess = mood => LIKELY_MAP[annotations[mood + 'Likelihood']];

  function cameraOn() {
    // Clear any previous annotations.
    setAnnotations(null);

    setPhotoData('');
    startCamera();
    setShowVideo(true);
  }

  const getPercent = mood => percentMap[annotations[mood + 'Likelihood']];

  const getQuote = mood => {
    const likelihood = annotations[mood + 'Likelihood'];
    const level = levelMap[likelihood];
    if (!level) return null;

    let qs = quotes[mood];
    qs = qs ? qs[level] : [];
    var quote = qs[Math.floor(Math.random() * qs.length)];
    return quote;
  };

  function has(mood) {
    const chance = annotations && annotations[mood + 'Likelihood'];
    return chance === 'VERY_LIKELY' || chance === 'LIKELY';
  }

  async function loadModel() {
    if (VIDEO_DETECT) {
      await faceApi.loadMtcnnModel('/models');
      // This model is needed to use .withFaceLandmarks().
      //await faceApi.loadFaceLandmarkModel('/models');
      // This model is needed to use .withFaceDescriptors().
      //await faceApi.loadFaceRecognitionModel('/models');
    } else {
      await faceApi.loadTinyFaceDetectorModel('/models');
    }

    // Don't start camera until the model has been loaded.
    cameraOn();
  }

  const sendToGoogle = async photoData => {
    try {
      const annotations = await sendPhoto(photoData);
      console.log('camera.js sendToGoogle: annotations =', annotations);
      setStatus('Determined emotions in photo.');
      setAnnotations(annotations);
    } catch (e) {
      handleError(e);
    }
  };

  const snapPhoto = async () => {
    videoOn = false;
    setStatus('Analyzing emotions in photo.');
    setShowVideo(false);

    const photoData = await takePhoto();
    setPhotoData(photoData);
    sendToGoogle(photoData);
  };

  useEffect(() => {
    loadModel();
  }, []);

  const foundEmotions = emotions.filter(has);
  const emojis = foundEmotions.map(emotion => (
    <img alt={emotion} key={emotion} src={`images/${emotion}.svg`} />
  ));
  if (emojis.length === 0)
    emojis.push(<img alt="none" key="none" src="images/none.svg" />);

  return (
    <div className="camera">
      <div className="top">
        <div className="corner tl" />
        <div className="corner tr" />
        <div className="corner bl" />
        <div className="corner br" />

        {showVideo && (
          <div className="video-panel">
            <video
              className="camera-video"
              autoPlay
              muted
              playsInline
              onPlay={video => onPlay(video, setStatus)}
            >
              <track kind="captions" />
            </video>
            <canvas className="video-canvas" />
            <svg
              className="shutter"
              height="64px"
              onClick={snapPhoto}
              width="64px"
            >
              <g fill="none">
                <circle cx="32" cy="32" r="32" fill="#72c7d5" />
                <circle cx="32" cy="32" r="26" stroke="white" strokeWidth="3" />
              </g>
            </svg>
          </div>
        )}

        <canvas
          className="camera-canvas"
          style={{display: photoData ? 'block' : 'none'}}
        />

        {!showVideo && (
          <div className="start-camera-btn" onClick={cameraOn}>
            <img alt="redo" id="redo" src="images/redo.svg" />
          </div>
        )}
      </div>

      <div className="status">{status}</div>

      {annotations && (
        <div className="annotations">
          <div className="emojis">{emojis}</div>
          {emotions.map(e => (
            <div className="emotion" key={e}>
              {/* <div key={e}>{`${capitalize(e)}: ${assess(e)}`}</div> */}
              <Bar key={e} label={capitalize(e)} percent={getPercent(e)} />
              <div className="quote">{getQuote(e)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Camera.propTypes = {
  photoUrl: string
};

export default Camera;
