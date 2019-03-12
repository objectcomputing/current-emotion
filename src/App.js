import React, {Component} from 'react';
import './App.scss';
import Camera from './camera/camera';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Camera />
      </div>
    );
  }
}

export default App;
