import * as faceApi from 'face-api.js';
import {string} from 'prop-types';
import React, {useCallback, useEffect, useState} from 'react';
import {getDataUrlFromVideo} from '../image-util';
import './camera.scss';

import {authToken} from '../secret.json';

const emotions = ['anger', 'headwear', 'joy', 'sorrow', 'surprise'];

const likelyMap = {
  UNKNOWN: 'not sure',
  VERY_UNLIKELY: 'no',
  UNLIKELY: 'probably not',
  POSSIBLE: 'maybe',
  LIKELY: 'probably',
  VERY_LIKELY: 'yes'
};

async function sendPhoto(photoData) {
  const url = 'https://vision.googleapis.com/v1/images:annotate';
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

  try {
    const res = await fetch(url, {method: 'POST', headers, body});
    const obj = await res.json();
    return obj.responses[0].faceAnnotations[0];
  } catch (e) {
    alert(e.message);
    console.error(e);
  }
}

function startCamera() {
  let receiver = navigator;
  if (
    !navigator.getUserMedia &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  ) {
    receiver = navigator.mediaDevices;
  }

  // This is not defined in tests run in jsdom.
  if (receiver.getUserMedia) {
    const successCb = stream => {
      if (window.Cypress) return;
      // Turn on camera and begin recording.
      const video = document.querySelector('.camera-video');
      video.srcObject = stream;
    };
    const errorCb = err => {
      // The most common errors are PermissionDenied and DevicesNotFound.
      console.error(err);
    };
    const constraints = {facingMode: 'environment'};
    receiver.getUserMedia({video: constraints}, successCb, errorCb);
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

  // Draw rectangles around all the faces.
  const faces = await faceApi.detectAllFaces(
    image,
    new faceApi.TinyFaceDetectorOptions()
  );
  context.strokeStyle = 'red';
  context.lineWidth = 3;
  console.log('faces found:', faces.length);
  for (const face of faces) {
    const {left, top, width, height} = face.box;
    context.strokeRect(left, top, width, height);
  }

  stopCamera();

  return photoData;
}

function Camera() {
  const [annotations, setAnnotations] = useState();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [photoData, setPhotoData] = useState('');
  const [showVideo, setShowVideo] = useState(false);

  const assess = mood => likelyMap[annotations[mood + 'Likelihood']];

  function has(mood) {
    const chance = annotations && annotations[mood + 'Likelihood'];
    return chance === 'VERY_LIKELY' || chance === 'LIKELY';
  }

  const cameraOn = () => {
    setPhotoData('');
    startCamera();
    setShowVideo(true);
  };

  const sendToGoogle = async photoData => {
    try {
      const annotations = await sendPhoto(photoData);
      //TODO: Display annotations.landmarks on top of photo?
      setAnnotations(annotations);
    } catch (e) {
      alert(e.message);
      console.error(e);
    }
  };

  const snapPhoto = async () => {
    if (!modelLoaded) {
      await faceApi.loadTinyFaceDetectorModel('/models');
      setModelLoaded(true);
    }
    const photoData = await takePhoto();
    setPhotoData(photoData);
    setShowVideo(false);
    sendToGoogle(photoData);
  };

  useEffect(cameraOn, []);

  const keyPressed = useCallback(event => {
    const {key} = event;
    if (key === ' ' || key === 'Enter') snapPhoto();
  }, []);

  // These emojis are from http://openmoji.org/.
  const foundEmotions = emotions.filter(has);
  const emojis = foundEmotions.map(emotion => (
    <img alt={emotion} key={emotion} src={`images/${emotion}.svg`} />
  ));
  if (emojis.length === 0)
    emojis.push(<img alt="none" src="images/none.svg" />);

  return (
    <div className="camera">
      <div className="top">
        <div className="corner tl" />
        <div className="corner tr" />
        <div className="corner bl" />
        <div className="corner br" />

        {showVideo && (
          <div className="video-panel">
            <video className="camera-video" autoPlay muted playsInline>
              <track kind="captions" />
            </video>
            <svg
              className="shutter"
              height="64px"
              onClick={snapPhoto}
              onKeyPress={keyPressed}
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
        {/* <img
          alt="camera output"
          className="camera-img"
          src={photoData}
          style={imgStyle}
        /> */}

        {!showVideo && (
          <div className="start-camera-btn" onClick={cameraOn}>
            <img alt="redo" id="redo" src="images/redo.svg" />
          </div>
        )}
      </div>

      {annotations && (
        <div className="annotations">
          <div className="emojis">{emojis}</div>
          <div>Anger: {assess('anger')}</div>
          <div>Headwear: {assess('headwear')}</div>
          <div>Joy: {assess('joy')}</div>
          <div>Sorrow: {assess('sorrow')}</div>
          <div>Surprise: {assess('surprise')}</div>
        </div>
      )}
    </div>
  );
}

Camera.propTypes = {
  photoUrl: string
};

export default Camera;
